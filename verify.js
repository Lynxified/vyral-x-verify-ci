/**
 * VYRAL X Verifier
 * ================
 * Verifies X/Twitter profiles from real, observed data. No database, no
 * WordPress, no AI, no MCP, no API keys. Prints JSON and exits.
 *
 * What it measures
 * ----------------
 *   - follower / following / post count from the live profile
 *   - REAL posting cadence from the timestamps of posts actually seen while
 *     scrolling (posts in the last 30 and 90 days)
 *   - account age, and the lifetime-average rate for comparison
 *
 * The cadence figure matters: lifetime tweet_count / account age is only an
 * average, so a dormant account with a large archive can still look active.
 * Counting real recent posts is the honest signal.
 *
 * Usage
 * -----
 *   node verify.js <handle> [handle...]            # human-readable summary
 *   node verify.js <handle> --json                 # JSON only, for piping
 *   node verify.js <handle> --posts 40 --scrolls 20
 *   node verify.js <handle> --min-followers 1000 --min-posts-per-month 10
 *
 * Requires: Google Chrome installed, and X_STATE env var (see login.js).
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("patchright");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    handles: [],
    json: false,
    posts: 60,
    scrolls: 25,
    minFollowers: 1000,
    minPostsPerMonth: 10,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--posts") opts.posts = parseInt(argv[++i], 10) || opts.posts;
    else if (a === "--scrolls") opts.scrolls = parseInt(argv[++i], 10) || opts.scrolls;
    else if (a === "--min-followers")
      opts.minFollowers = parseInt(argv[++i], 10) || opts.minFollowers;
    else if (a === "--min-posts-per-month")
      opts.minPostsPerMonth = parseInt(argv[++i], 10) || opts.minPostsPerMonth;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (!a.startsWith("--")) opts.handles.push(a.replace(/^@/, ""));
  }
  return opts;
}

const HELP = `
vyral-x-verify ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â verify X profiles from real observed data

  node verify.js <handle> [handle...]   verify one or more handles
  node verify.js <handle> --json        JSON only (for piping)

Options
  --posts N                  stop after N posts observed      (default 60)
  --scrolls N                max scroll attempts per handle  (default 25)
  --min-followers N          follower threshold              (default 1000)
  --min-posts-per-month N    cadence threshold              (default 10)
  --json                     emit only JSON
  -h, --help                 this text

Env
  X_STATE       base64 Playwright storage state (required)
                generate with:  node login.js
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_DAY = 86400000;
const MS_HOUR = 3600000;
const MS_MONTH = MS_DAY * 30.4375;
// A post "exactly 30 days old" lands a few ms past the boundary once the
// ISO string is rounded, so windows get a small grace period.
const WINDOW_GRACE = MS_HOUR;

/** "1.2K" / "3M" / "12,345" -> 1200 / 3000000 / 12345 */
function parseCount(str) {
  if (str === null || str === undefined) return null;
  if (typeof str === "number") return Number.isFinite(str) ? str : null;
  const s = String(str)
    // X uses both "1,234" and, in some locales, "1 234".
    .replace(/[,\s]/g, "")
    .trim();
  const m = s.match(/([\d.]+)\s*([KkMmBb])?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = (m[2] || "").toUpperCase();
  if (suffix === "K") n *= 1e3;
  else if (suffix === "M") n *= 1e6;
  else if (suffix === "B") n *= 1e9;
  return Math.round(n);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n) {
  return new Date(Date.now() - n * MS_DAY);
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

function launchOptions() {
  const opts = {
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const host = process.env.PROXY_HOST;
  const port = process.env.PROXY_PORT;
  if (host && port) {
    opts.proxy = {
      server: `http://${host}:${port}`,
      username: process.env.PROXY_USER || undefined,
      password: process.env.PROXY_PASS || undefined,
    };
  }
  return opts;
}

function storageStatePath() {
  const dir = __dirname;
  if (process.env.X_STATE) {
    const p = path.join(dir, "state-ci.json");
    fs.writeFileSync(p, Buffer.from(process.env.X_STATE, "base64").toString());
    return p;
  }
  return path.join(dir, "state.json");
}

async function newContext() {
  const statePath = storageStatePath();
  const viewports = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
  ];
  const viewport = viewports[randInt(0, viewports.length - 1)];

  const contextOptions = { viewport };
  if (fs.existsSync(statePath)) contextOptions.storageState = statePath;

  const context = await browser.newContext(contextOptions);

  // Anti-detection, carried over from the scraper this forked from.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    window.chrome = { runtime: {} };
    const orig = window.navigator.permissions.query;
    window.navigator.permissions.query = (params) =>
      params.name === "notifications"
        ? Promise.resolve({ state: Notification.permission })
        : orig(params);
  });

  return context;
}

// ---------------------------------------------------------------------------
// Profile metrics
// ---------------------------------------------------------------------------

/**
 * Read follower/following/post counts and account age off the profile page.
 * Runs entirely in the page so it is one round-trip.
 */
async function readProfile(page, fallbackHandle) {
  return page.evaluate((fallback) => {
    const out = {
      handle: fallback,
      displayName: null,
      bio: null,
      followers: null,
      following: null,
      posts: null,
      joined: null,
      verified: false,
      avatar: null,
    };

    // Handle / display name / bio
    const nameEl = document.querySelector('[data-testid="UserName"]');
    if (nameEl) {
      const spans = Array.from(nameEl.querySelectorAll("span")).map((s) =>
        s.textContent.trim()
      );
      out.handle = spans.find((s) => s && !s.startsWith("@")) || out.handle;
      const at = spans.find((s) => s.startsWith("@"));
      if (at) out.handle = at.replace(/^@/, "");
      const dn = spans.find(
        (s) => s && !s.startsWith("@") && s.length < 60 && !/^\d/.test(s)
      );
      if (dn) out.displayName = dn;
    }

    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    if (bioEl) out.bio = bioEl.textContent.trim();

    out.verified = !!document.querySelector(
      '[data-testid="UserName"] svg[data-testid="icon-verified"]'
    );

    const avatar = document.querySelector(
      '[data-testid="UserAvatar-Container-unknown"] img'
    );
    if (avatar) out.avatar = avatar.src;

    // Counts. X renders "<number> <Label>" in the profile header, but the
    // counts sit in an ANCESTOR of [data-testid="UserProfileHeader_Items"] —
    // that element only holds the bio and join date (observed live: 53 chars,
    // no counts). So walk up from the label until the numbers are in scope.
    //
    // This also keeps sidebar noise ("Elon Musk follows", "Not followed by
    // anyone") out, because we stop at the smallest container that holds the
    // stat rather than scanning the whole page.
    const anchorRegex = (label) =>
      new RegExp(
        "(?:^|[^\\d.,A-Za-z])([\\d][\\d.,]*\\s*[KkMmBb]?)\\s+" + label + "\\b",
        "i"
      );

    /** Smallest ancestor of `start` whose text matches, else the body. */
    function scopeFor(start, label) {
      const re = anchorRegex(label);
      let el = start;
      while (el && el !== document.body) {
        const t = el.innerText || "";
        if (t.length > 4000) break; // walked too far, almost certainly not the header
        if (re.test(t)) return t;
        el = el.parentElement;
      }
      // Fall back to the primary column: excludes the right-hand sidebar
      // where suggestion and trend text lives.
      const col = document.querySelector('[data-testid="primaryColumn"]');
      return (col && col.innerText) || document.body.innerText || "";
    }

    // Anchor the search on the label element, then walk up for its number.
    function findStat(label) {
      const re = anchorRegex(label);
      let node = null;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (n.nodeValue && new RegExp("\\b" + label + "\\b", "i").test(n.nodeValue)) {
          node = n.parentElement;
          break;
        }
      }
      const scope = scopeFor(node, label);
      const m = scope.match(re);
      return m ? m[1].trim() : null;
    }

    out.followers = findStat("Followers");
    out.following = findStat("Following");

    // Posts is trickier: the tab label "Posts" carries no number, and the
    // count appears as "26.8K posts" on a separate line.
    {
      const col =
        document.querySelector('[data-testid="primaryColumn"]') ||
        document.body;
      const text = col.innerText || "";
      const m = text.match(/(?:^|\s)([\d][\d.,]*\s*[KkMmBb]?)\s+[Pp]osts\b/);
      out.posts = m ? m[1].trim() : null;
    }

    // Account age: "Joined <Month Year>". The join line sits in the
    // UserProfileHeader_Items block, so read it from there rather than from
    // the whole page.
    const joinedScope = document.querySelector(
      '[data-testid="UserProfileHeader_Items"]'
    );
    const joinedM = (joinedScope?.innerText || "").match(
      /Joined\s+([A-Za-z]+\s+\d{4})/i
    );
    if (joinedM) {
      const d = new Date(joinedM[1] + " 01T00:00:00Z");
      if (!Number.isNaN(d.getTime())) out.joined = d.toISOString();
    }

    return out;
  }, fallbackHandle);
}

// ---------------------------------------------------------------------------
// Recent posts
// ---------------------------------------------------------------------------

/**
 * Collect timestamps + engagement for every article currently in the DOM.
 * Timestamps are what prove recent activity.
 */
async function collectArticles(page, seen) {
  return page.evaluate((seenIds) => {
    const out = [];
    for (const article of document.querySelectorAll("article")) {
      try {
        const link = article.querySelector('a[href*="/status/"]');
        const href = link ? link.getAttribute("href") || "" : "";
        const id = href.split("/status/")[1]?.split("?")[0] || null;
        if (!id || seenIds.includes(id)) continue;

        const timeEl = article.querySelector("time");
        const iso = timeEl ? timeEl.getAttribute("datetime") : null;
        const text = (article.innerText || "").trim();

        const label = (name) => {
          const btn = article.querySelector(
            `[data-testid="${name}"], [aria-label*="${name}"]`
          );
          if (!btn) return 0;
          const raw =
            btn.getAttribute("aria-label") || btn.textContent || "";
          const m = raw.match(/([\d.,]+\s*[KkMm]?)/);
          return m ? m[1] : 0;
        };

        out.push({
          id,
          url: "https://x.com" + href,
          postedAt: iso,
          // Pinned posts are older and would skew the recency window.
          pinned: /Pinned/i.test(text.slice(0, 80)),
          replies: label("reply"),
          retweets: label("retweet"),
          likes: label("like"),
          views: label("analytics") || 0,
        });
      } catch {
        // skip malformed article
      }
    }
    return out;
  }, seen);
}

/** Epoch ms for a parseable timestamp, else null. Never returns NaN. */
function parseTime(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function summarise(articles, now = Date.now()) {
  // Drop anything without a usable timestamp. A NaN date would silently
  // compare false and be counted as neither recent nor old, and a garbage
  // entry must never inflate a real posting rate.
  const timed = articles
    .map((a) => ({ ...a, t: parseTime(a.postedAt) }))
    .filter((a) => a.t !== null);

  const last30 = timed.filter((a) => now - a.t <= 30 * MS_DAY + WINDOW_GRACE);
  const last90 = timed.filter((a) => now - a.t <= 90 * MS_DAY + WINDOW_GRACE);
  const sorted = timed.map((a) => a.t).sort((x, y) => x - y);

  return {
    observed: timed.length,
    posts30d: last30.length,
    posts90d: last90.length,
    // Normalised so the 30d and 90d windows are comparable.
    perMonth30d: Math.round((last30.length / 30) * 30.4375 * 10) / 10,
    perMonth90d: Math.round((last90.length / 90) * 30.4375 * 10) / 10,
    mostRecent: sorted.length ? new Date(sorted[sorted.length - 1]).toISOString() : null,
    oldestObserved: sorted.length ? new Date(sorted[0]).toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Verify one handle
// ---------------------------------------------------------------------------

async function verifyHandle(handle, opts) {
  const context = await newContext();
  const page = await context.newPage();
  const result = {
    handle,
    ok: false,
    error: null,
    followers: null,
    following: null,
    posts_total: null,
    account_created: null,
    account_age_days: null,
    lifetime_posts_per_month: null,
    cadence: null,
    sample: { observed: 0, engagement_total: 0 },
    thresholds: {
      minFollowers: opts.minFollowers,
      minPostsPerMonth: opts.minPostsPerMonth,
    },
    checks: null,
    verdict: "unknown",
    reasons: [],
    checkedAt: new Date().toISOString(),
  };

  try {
    await page.goto(`https://x.com/${handle}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(randInt(3000, 5500));

    // Login wall check
    const walled = await page.locator(
      '[data-testid="loginButton"], [data-testid="signupButton"]'
    ).count();
    if (walled > 0) {
      result.error =
        "Login wall detected. X_STATE cookies are missing or expired ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â run: node login.js";
      return result;
    }

    const profile = await readProfile(page, handle);
    result.handle = profile.handle || handle;
    result.display_name = profile.displayName;
    result.bio = profile.bio;
    result.verified = profile.verified;
    result.avatar = profile.avatar;
    result.followers = parseCount(profile.followers);
    result.following = parseCount(profile.following);
    result.posts_total = parseCount(profile.posts);
    result.account_created = profile.joined;

    if (result.account_created) {
      const age = Date.now() - Date.parse(result.account_created);
      result.account_age_days = Math.floor(age / MS_DAY);
      if (
        typeof result.posts_total === "number" &&
        result.account_age_days > 0
      ) {
        result.lifetime_posts_per_month =
          Math.round(
            (result.posts_total / (result.account_age_days / 30.4375)) * 10
          ) / 10;
      }
    }

    // Scroll and observe real posts.
    const seen = new Set();
    const collected = [];
    let scrolls = 0;
    let empty = 0;

    while (scrolls < opts.scrolls && collected.length < opts.posts) {
      const batch = await collectArticles(page, Array.from(seen));
      let added = 0;
      for (const post of batch) {
        if (seen.has(post.id)) continue;
        seen.add(post.id);
        collected.push(post);
        added += 1;
      }

      if (added === 0) {
        empty += 1;
        // A long dry run means the timeline is exhausted.
        if (empty >= 4) break;
      } else {
        empty = 0;
      }

      await page.mouse.move(randInt(80, 900), randInt(200, 700));
      // The scroll amount must be PASSED IN: page.evaluate runs this function
      // inside the browser, where Node-scope helpers like randInt do not exist.
      const scrollBy = randInt(700, 2200);
      await page.evaluate((amount) => window.scrollBy(0, amount), scrollBy);
      await page.waitForTimeout(randInt(1400, 3000));
      scrolls += 1;
    }

    // Pinned posts are not recent activity; exclude from the cadence window.
    const timed = collected.filter((p) => p.postedAt);
    const unpinned = timed.filter((p) => !p.pinned);

    result.cadence = summarise(unpinned);
    result.cadence.timeline_exhausted = empty >= 4;
    result.cadence.scrolls = scrolls;
    result.cadence.pinned_excluded = timed.length - unpinned.length;

    result.sample = {
      observed: unpinned.length,
      engagement_total: unpinned.reduce(
        (sum, p) =>
          sum +
          (parseCount(p.likes) || 0) +
          (parseCount(p.retweets) || 0) +
          (parseCount(p.replies) || 0),
        0
      ),
    };
    result.recent_posts = unpinned.slice(0, 10).map((p) => ({
      url: p.url,
      postedAt: p.postedAt,
      likes: parseCount(p.likes),
      retweets: parseCount(p.retweets),
      replies: parseCount(p.replies),
    }));

    // Verdict rate. Only use a window we actually observed: perMonth90d divides
    // the posts we saw by 90 days, so it is only trustworthy once the observed
    // span genuinely reaches ~90 days. Otherwise the un-scrolled remainder is
    // silently counted as silence, which understates the rate and would reject
    // a consistent poster (e.g. 20 posts in the last 30 days, but only 3 pages
    // scrolled, yielding a fake 7.4/month).
    const observedSpanForRate = result.cadence.oldestObserved
      ? Math.floor(
          (Date.parse(result.cadence.mostRecent || result.cadence.oldestObserved) -
            Date.parse(result.cadence.oldestObserved)) /
            86400000
        )
      : 0;
    const SPAN_FOR_90D_RATE = 75; // some slack below a full quarter
    const rate =
      observedSpanForRate >= SPAN_FOR_90D_RATE && result.cadence.perMonth90d > 0
        ? result.cadence.perMonth90d
        : result.cadence.perMonth30d > 0
          ? result.cadence.perMonth30d
          : result.lifetime_posts_per_month != null
            ? result.lifetime_posts_per_month
            : result.cadence.perMonth90d;

    const followersOk =
      typeof result.followers === "number" &&
      result.followers >= opts.minFollowers;

    // A verdict must not depend on how far we happened to scroll. A short run
    // sees a busy few days and understates the monthly rate, which would flip a
    // real account to "fails".
    //
    // The rate is derived from whatever span we actually observed, so a wide
    // span is trustworthy. Require enough observed days to extrapolate a month
    // from, and treat anything narrower as unverified rather than as evidence
    // of inactivity.
    const MIN_SPAN_FOR_RATE_DAYS = 30;
    const measuredSpanDays = result.cadence.oldestObserved
      ? Math.floor(
          (Date.parse(result.cadence.mostRecent || result.cadence.oldestObserved) -
            Date.parse(result.cadence.oldestObserved)) /
            86400000
        )
      : 0;
    const windowCovered = measuredSpanDays >= MIN_SPAN_FOR_RATE_DAYS;
    const enoughSample = result.cadence.observed >= 5;

    // Hard lower bound on the true 30-day post count.
    //
    // Every post we actually saw that is dated within the last 30 days is proof
    // the account made at least that many posts in the last 30 days. Days we
    // never scrolled can only add posts, never remove them, so this count is a
    // floor rather than an estimate.
    //
    // This matters because a burst poster (@ycombinator posts in clusters) can
    // clear 30 posts/month inside a 20-day scroll and still fail the 30-day
    // span requirement forever, no matter how many extra scrolls are spent.
    const postsInLast30 = result.cadence.posts30d ?? 0;
    const provenPostsPerMonth = postsInLast30;

    result.cadence.span_days = measuredSpanDays;
    result.cadence.window_covered = windowCovered;

    const rateOk = typeof rate === "number" && rate >= opts.minPostsPerMonth;
    // A short scroll can still certify a PASS on its own, because postsInLast30
    // is a hard floor. It can never certify a FAIL, since unscrolled days might
    // hide the posts that would clear the bar - that stays unverified.
    const provenOk = enoughSample && provenPostsPerMonth >= opts.minPostsPerMonth;
    const cadenceVerdict = !enoughSample
      ? null
      : windowCovered
        ? rateOk
        : provenOk
          ? true
          : null;

    // If the profile itself could not be read we have learned nothing about this
    // account. Reporting that as a rejection would blame the applicant for our
    // own breakage (blocked IP, changed DOM, logged-out wall), so it surfaces as
    // an error and the caller can retry instead of auto-rejecting a real creator.
    const profileUnreadable =
      typeof result.followers !== "number" && result.cadence.observed === 0;

    result.checks = {
      followers: followersOk,
      posting_rate: cadenceVerdict,
      posting_rate_used: windowCovered ? rate : provenPostsPerMonth,
      posting_rate_basis: windowCovered
        ? "observed_30d_rate"
        : provenOk
          ? "proven_posts_in_last_30d"
          : "insufficient",
      posts_in_last_30d: postsInLast30,
      sample_sufficient: enoughSample,
      window_covered: windowCovered,
      profile_readable: !profileUnreadable,
    };

    result.verdict = profileUnreadable
      ? "error"
      : !followersOk
        ? "fails"
        : cadenceVerdict === null
          ? "passes_followers_unverified_cadence"
          : cadenceVerdict
            ? "passes"
            : "fails";

    // Only report judgement reasons when we actually managed to read the
    // profile. Blaming an applicant with "needs 1,000 followers" when the real
    // problem is that our scrape returned nothing is worse than saying nothing.
    if (profileUnreadable) {
      result.reasons = [
        "Profile could not be read at all (no follower count and no posts). " +
          "This is a scraping failure, not a judgement about the account. Retry later.",
      ];
    } else {
      if (!followersOk) {
        result.reasons.push(
          `Needs at least ${opts.minFollowers.toLocaleString()} followers ` +
            `(has ${(result.followers ?? 0).toLocaleString()}).`
        );
      }
      if (cadenceVerdict === false) {
        result.reasons.push(
          `Needs at least ${opts.minPostsPerMonth} posts per month ` +
            `(observed ${rate} across ${measuredSpanDays} days of timeline).`
        );
      }
      if (!enoughSample) {
        result.reasons.push(
          `Only ${result.cadence.observed} recent post(s) observed; not enough ` +
            `to judge posting cadence.`
        );
      }
      if (!windowCovered && !provenOk) {
        // Only nudge for another run when a further scroll could still change
        // the answer. When the 30-day floor already clears the bar we passed on
        // proof, so there is nothing left to confirm.
        result.reasons.push(
          provenOk
            ? `Scrolled ${measuredSpanDays} day(s) of timeline, but already saw ` +
                `${postsInLast30} post(s) in the last 30 days, which clears the ` +
                `${opts.minPostsPerMonth}/month bar on its own.`
            : `Timeline covered only ${measuredSpanDays} day(s); at least ` +
                `${MIN_SPAN_FOR_RATE_DAYS} are needed for the monthly rate to be ` +
                `meaningful. Re-run with more scrolls.`
        );
      }
      if (typeof result.followers !== "number") {
        result.reasons.push("Could not read a follower count from the profile.");
      }
    }

    result.ok = !profileUnreadable;
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  } finally {
    await context.close().catch(() => {});
  }

  return result;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const tick = (b) => (b ? "yes" : "NO");

function report(r) {
  const lines = [];
  lines.push(`\n  @${r.handle}  ${r.display_name ? `(${r.display_name})` : ""}`);
  if (r.error) {
    lines.push(`    error: ${r.error}`);
    return lines.join("\n");
  }
  lines.push(`    followers      ${r.followers?.toLocaleString() ?? "?"}   (need ${r.thresholds.minFollowers.toLocaleString()}) ${tick(r.checks?.followers)}`);
  lines.push(`    posts (total)  ${r.posts_total?.toLocaleString() ?? "?"}`);
  if (r.account_created) {
    lines.push(`    account age    ${r.account_age_days} days  (joined ${r.account_created.slice(0, 10)})`);
    lines.push(`    lifetime rate  ${r.lifetime_posts_per_month ?? "?"} posts/month`);
  }
  const c = r.cadence;
  if (c) {
    lines.push(`    observed       ${c.observed} recent posts over ${c.scrolls} scrolls${c.timeline_exhausted ? " (timeline exhausted)" : ""}`);
    lines.push(`    posts last 30d ${c.posts30d}   -> ${c.perMonth30d}/month`);
    lines.push(`    posts last 90d ${c.posts90d}   -> ${c.perMonth90d}/month  (need ${r.thresholds.minPostsPerMonth}) ${tick(r.checks?.posting_rate === true)}`);
    if (c.mostRecent) lines.push(`    most recent    ${c.mostRecent.slice(0, 10)}`);
  }
  lines.push(`    VERDICT        ${r.verdict}`);
  for (const reason of r.reasons) lines.push(`      - ${reason}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let browser;

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || opts.handles.length === 0) {
    console.log(HELP);
    process.exit(opts.help ? 0 : 1);
  }

  if (!process.env.X_STATE && !fs.existsSync(path.join(__dirname, "state.json"))) {
    console.error(
      "No X session found.\n" +
        "  Run: node login.js   (log in once, it saves state.json)\n" +
        "  or set the X_STATE env var to a base64 storage state."
    );
    process.exit(1);
  }

  console.error(`Verifying ${opts.handles.length} handle(s)...`);

  try {
    browser = await chromium.launch(launchOptions());
  } catch (e) {
    console.error(
      `Could not launch Chrome: ${e.message}\n` +
        "  This tool uses real Chrome (channel: 'chrome'), so Google Chrome " +
        "must be installed on this machine."
    );
    process.exit(1);
  }

  const results = [];
  for (const handle of opts.handles) {
    process.stderr.write(`  @${handle} ... `);
    const r = await verifyHandle(handle, opts);
    results.push(r);
    process.stderr.write(r.error ? "error\n" : `${r.verdict}\n`);
    // Small gap so we do not hammer the profile in a tight loop.
    await new Promise((res) => setTimeout(res, randInt(2500, 5000)));
  }

  await browser.close();

  // Remove the decoded session file if we created it from the env var.
  const ci = path.join(__dirname, "state-ci.json");
  if (process.env.X_STATE && fs.existsSync(ci)) fs.unlinkSync(ci);

  if (opts.json) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  } else {
    for (const r of results) console.log(report(r));
    const failed = results.filter((r) => r.verdict === "fails").length;
    const passed = results.filter((r) => r.verdict === "passes").length;
    const unknown = results.length - failed - passed;
    console.log(
      `\n  ${passed} pass, ${failed} fail, ${unknown} unverified of ${results.length}`
    );
  }

  // Non-zero exit if anything failed, so this is usable in CI.
  process.exit(results.some((r) => r.verdict === "fails") ? 1 : 0);
})().catch((e) => {
  console.error("fatal:", e);
  if (browser) browser.close().catch(() => {});
  process.exit(1);
});
