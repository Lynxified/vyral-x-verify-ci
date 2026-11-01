/**
 * Read X Chat for DM-code ownership matches — 2026 embedded-chat edition.
 *
 * Usage:
 *   node chat.js --expect-code vyral-ABCD234 [--expected somehandle] --json
 *
 * Proof model (see turso-schema-x-dm-codes.sql):
 *   the pass verifies only when a conversation WITH the expected handle
 *   contains the exact code. Sender handles cannot be forged in DMs, so a
 *   leaked code sent from another account matches nothing.
 *
 * How the 2026 X Chat app works (probed live, see probe-chat-*.mjs):
 *   - /i/chat renders `xchatEmbedRoute` with an OPEN SHADOW ROOT; everything
 *     is in there. Playwright locators pierce open shadow roots by default.
 *   - an inbox list is unstable/empty for request-gated threads, so the
 *     reader does NOT scan lists: it dereferences each claimed handle through
 *     the composer's recipient search (new-dm-search-input) and opens that
 *     conversation directly. Whether it sits in the inbox, requests or a
 *     request-gated panel (dm-message-request-prompt), the messages are
 *     readable in dm-message-list.
 *   - the participant is confirmed from the thread's own texts (header and
 *     the request prompt both carry "@<handle>"), not from guessed markup.
 *   - the composer suggestion row id carries the X USER ID, recorded as
 *     sender evidence.
 *
 * Session behaviour:
 *   - the login comes from state.json (same file as verify.js)
 *   - X Chat locks behind a passcode; it is entered once per session from
 *     CHAT_PIN (never logged, never stored in the output)
 *
 * Environment:
 *   CHAT_PIN            the account's chat passcode (falls back to "2005"
 *                       ONLY when X_ALLOW_DEFAULT=1 is also set; production
 *                       must set CHAT_PIN or the reader refuses to run)
 *   X_STATE_PATH        session file, as in verify.js
 *
 * Output (--json): a JSON document. Whole threads are intentionally NOT
 * returned — only matches, ids and counts.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require_ = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { codes: [], expected: [], json: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--expect-code") args.codes.push((argv[++i] || "").trim());
    else if (a === "--expected") args.expected.push((argv[++i] || "").trim());
    else if (a === "--json") args.json = true;
    else if (a === "--max") void ++i; // kept for CLI compatibility; unused
  }
  args.codes = args.codes.filter(Boolean);
  args.expected = args.expected.map((h) => h.toLowerCase().replace(/^@+/, "")).filter(Boolean);
  return args;
}

function result({ ok, error = null, read_conversations = 0, requests_checked = false, matches = [], passcode_entered = false, read_ok = false }) {
  return {
    reader: "chat",
    ok,
    error,
    // true ONLY when chat was actually opened and scanned. Separates "clean
    // read, the code is not there yet" (a verdict) from "could not read"
    // (infrastructure). Callers must never turn the first into a rejection.
    read_ok,
    read_conversations,
    requests_checked,
    matches,
    passcode_entered,
    checkedAt: new Date().toISOString(),
  };
}

const CODE_RE = /vyral[-_ ]?([A-Z2-9]{8})/gi;

function codeMatches(text) {
  if (!text) return [];
  const hits = [];
  CODE_RE.lastIndex = 0;
  let m;
  while ((m = CODE_RE.exec(text)) !== null) {
    hits.push("vyral-" + m[1].toUpperCase());
  }
  return hits;
}

async function main() {
  const args = parseArgs(process.argv);

  const pin = process.env.CHAT_PIN || (process.env.X_ALLOW_DEFAULT === "1" ? "2005" : "");
  if (!pin) {
    console.log(JSON.stringify(result({ ok: false, error: "CHAT_PIN not configured" })));
    process.exitCode = 1;
    return;
  }
  if (args.codes.length === 0) {
    console.log(JSON.stringify(result({ ok: false, error: "no codes to expect (--expect-code)" })));
    process.exitCode = 1;
    return;
  }

  let patchright;
  try {
    patchright = require_("patchright");
  } catch (e) {
    console.log(JSON.stringify(result({ ok: false, error: "patchright not installed: " + e.message })));
    process.exitCode = 1;
    return;
  }

  let storageStatePath = path.join(here, "state.json");
  if (process.env.X_STATE_PATH && fs.existsSync(process.env.X_STATE_PATH)) {
    storageStatePath = process.env.X_STATE_PATH;
  } else if (process.env.X_STATE) {
    storageStatePath = path.join(here, "state-ci.json");
    fs.writeFileSync(storageStatePath, Buffer.from(process.env.X_STATE, "base64").toString());
  }

  const browser = await patchright.chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined,
  });
  context.setDefaultTimeout(20000);

  const page = await context.newPage();
  const out = result({ ok: false });

  try {
    // ---- open chat ---------------------------------------------------------
    await page.goto("https://x.com/i/chat", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(6000);
    if (!/\/i\/chat/.test(page.url())) {
      out.error = "Chat route did not open (redirected to " + page.url() + ")";
      console.log(JSON.stringify(out));
      process.exitCode = 1;
      return;
    }

    // ---- passcode wall -----------------------------------------------------
    const pinInputs = await page.locator('input[maxlength="1"]').all();
    if (pinInputs.length < 4) {
      // Either the wall is absent or we are logged out entirely.
      const walled = await page.locator('[data-testid="loginButton"], [data-testid="signupButton"]').count();
      const authenticated = (await page.locator('[data-testid="dm-new-chat-button"]').count()) > 0;
      if (authenticated) {
        // No wall; chat is directly reachable. proceed to the scan below.
      } else {
        out.error =
          walled > 0
            ? "Login wall detected. Session expired — run: node login.js"
            : "Chat did not open and no passcode prompt was found";
        console.log(JSON.stringify(out));
        process.exitCode = 1;
        return;
      }
    } else {
      for (let i = 0; i < 4; i++) {
        await pinInputs[i].click();
        await page.keyboard.type(pin[i], { delay: 100 });
        await page.waitForTimeout(120);
      }
      out.passcode_entered = true;
      await page.waitForTimeout(6000);
    }

    if (/pin\/recovery/.test(page.url())) {
      out.error = "Chat still passcode-locked after entry — wrong CHAT_PIN?";
      console.log(JSON.stringify(out));
      process.exitCode = 1;
      return;
    }

    // ---- dereference conversations by handle --------------------------------
    // Handles cannot be trusted from list previews; each claimed handle is
    // opened through the composer search so the thread CERTAINLY belongs to
    // it, then participant + message texts are read from the open thread.
    const wantedCodes = args.codes.map((c) => c.toUpperCase());
    const matches = [];
    let threadsRead = 0;

    for (const expected of args.expected.length ? args.expected : [null]) {
      // Re-open the composer fresh for each handle.
      const newChat = page.locator('[data-testid="dm-new-chat-button"]');
      if ((await newChat.count()) === 0) {
        out.error = "Chat app structure changed (no new-message button) — reader needs an update.";
        console.log(JSON.stringify(out));
        process.exitCode = 1;
        return;
      }
      await newChat.click().catch(() => {});
      await page.waitForTimeout(1500);

      const searchInput = page.locator('[data-testid="new-dm-search-input"]');
      if ((await searchInput.count()) === 0) {
        out.error = "Chat app structure changed (no recipient search) — reader needs an update.";
        console.log(JSON.stringify(out));
        process.exitCode = 1;
        return;
      }
      await searchInput.click();
      if (expected) {
        await page.keyboard.type(expected, { delay: 80 });
      }
      await page.waitForTimeout(2500);

      if (!expected) continue; // no-handle mode only asserts the reader runs

      const row = page
        .locator('[data-testid^="new-dm-user-suggestion"]')
        .filter({ hasText: expected })
        .first();
      if ((await row.count()) === 0) {
        // No thread with this handle exists yet: honest, but no match either.
        out.error = out.error || `No conversation with @${expected} exists yet.`;
        continue;
      }

      // The suggestion row id carries the X USER ID — honest sender evidence.
      const rowTestId = await row.getAttribute("data-testid");
      const userIdMatch = /(\d{10,20})/.exec(rowTestId || "");
      const senderUserId = userIdMatch ? userIdMatch[1] : null;

      await row.click();

      // The thread content loads asynchronously (message list pulls history
      // after the conversation opens). Poll briefly instead of a fixed sleep:
      // reading too early understates what is there, which would turn a real
      // match into a false "not yet".
      let msgCountsTrail = [];
      let ready = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await page.waitForTimeout(1300);
        const probe = await page.evaluate(() => {
          const root = document.querySelector('[data-testid="xchatEmbedRoute"]')?.shadowRoot;
          if (!root) return { count: -1 };
          return {
            count: root.querySelectorAll('[data-testid^="message-text-"]').length,
          };
        });
        msgCountsTrail.push(probe.count);
        if (probe.count > 0) {
          ready = true;
          break;
        }
      }

      const thread = await page.evaluate((codeSeed) => {
        const root = document.querySelector('[data-testid="xchatEmbedRoute"]')?.shadowRoot;
        if (!root) return null;
        const headers = [];
        for (const sel of ['[data-testid="dm-conversation-header"]', '[data-testid="dm-conversation-username"]', '[data-testid="dm-message-request-prompt"]']) {
          const el = root.querySelector(sel);
          if (el) headers.push((el.textContent || "").slice(0, 400));
        }
        const messageTexts = Array.from(root.querySelectorAll('[data-testid^="message-text-"]'))
          .slice(0, 60)
          .map((el) => (el.textContent || "").trim());
        const messageIds = Array.from(root.querySelectorAll('[data-testid^="message-"]'))
          .map((el) => (el.getAttribute("data-testid") || "").replace(/^message-text-/, "").replace(/^message-/, ""))
          .filter((id) => /^[0-9a-f-]{16,64}$/i.test(id));
        return {
          header: headers.join(" | "),
          messageTexts,
          messageIds: Array.from(new Set(messageIds)).slice(0, 30),
          knot: codeSeed,
        };
      }, wantedCodes[0]);

      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(800);

      if (!thread) {
        out.error = "Could not read the open conversation (shadow root missing).";
        continue;
      }

      threadsRead += 1;
      // Honest observability: counts only — no message text or headers are
      // ever emitted by the reader.
      out.message_counts = [...(out.message_counts || []), { handle: expected, trail: msgCountsTrail, read: thread.messageTexts.length }];

      // Participant truth: the caller's own texts must name the expected
      // handle (thread header or the request prompt do).
      const headerHandles = new Set(
        (thread.header.match(/@([A-Za-z0-9_]{1,15})/g) || []).map((h) => h.slice(1).toLowerCase())
      );
      if (args.expected.length && headerHandles.size && !headerHandles.has(expected)) {
        matches.push({
          handle: null,
          conversation_key: expected,
          error: `The conversation named @${expected} is actually with ${Array.from(headerHandles).map((h) => "@" + h).join(", ")}.`,
          codes: [],
        });
        continue;
      }

      const foundCodes = codeMatches(thread.messageTexts.join("\n"));
      // Case-normalise BOTH sides: the capture keeps the lowercase prefix,
      // argv codes are upper-cased whole — a raw includes() compared
      // "vyral-X" against "VYRAL-X" and never intersected.
      const hit = foundCodes.filter((c) => wantedCodes.includes(c.toUpperCase()));
      if (hit.length) {
        matches.push({
          handle: expected,
          conversation_key: expected,
          // User id from the suggestion row — recorded, never rendered.
          sender_user_id: senderUserId,
          codes: hitArray(hit),
        });
      }
    }

    out.read_ok = true;
    out.read_conversations = threadsRead;
    out.requests_checked = true; // search dereference covers request-gated threads
    out.matches = matches.filter((m) => (m.codes || []).length > 0 && m.handle);
    out.ok = out.matches.length > 0;

    if (!out.ok) {
      const realFailure = matches.find((m) => !m.handle);
      out.error =
        (realFailure && realFailure.error) ||
        (threadsRead
          ? `No matching DM yet — read ${threadsRead} conversation(s) for the claimed handle${args.expected.length ? "" : ""}.`
          : (out.error || "No conversations to read yet."));
    }
    console.log(JSON.stringify(out));
  } catch (error) {
    out.error = "chat reader failed: " + (error instanceof Error ? error.message : String(error));
    console.log(JSON.stringify(out));
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
}

function hitArray(codes) {
  return Array.from(new Set(codes));
}

await main();
