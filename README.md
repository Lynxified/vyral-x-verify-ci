# vyral-x-verify-ci

The VYRAL X-verifier, running on **GitHub Actions** instead of a VPS.
Generated from [guildera/guildera-scraper-wp-template](https://github.com/guildera/guildera-scraper-wp-template).

## How a check flows

```
site (Vercel) --workflow_dispatch--> this repo's verify.yml
   runner: node chat.js | verify.js   (X session from secrets)
   result --POST callback--> vyral.guildera.ai/api/x-verifier/callback
site polls its own x_verify_checks row and finishes the check (burn / verdict)
```

- `verify.yml` — one job per check (`mode=chat|profile`, `check_id`, `code`, `handle`)
- `canary.yml` — daily reader-health probe (cron 06:17 UTC); failure = email
- `chat.js` / `verify.js` — the readers themselves (identical to the box versions)

## Actions secrets (Settings → Secrets → Actions)

| Secret | Value |
|---|---|
| `X_STATE` | base64 of the @grokasaurus19 session (`certutil -encode state.json state.b64`, strip newlines) |
| `CHAT_PIN` | the X Chat passcode |
| `VYRAL_CALLBACK_URL` | `https://vyral.guildera.ai/api/x-verifier/callback` |
| `VYRAL_CALLBACK_SECRET` | shared secret with the site |

## Rotating the X session

1. `node login.js` on any machine (writes `state.json`)
2. base64 it (see table above)
3. `gh secret set X_STATE < state.b64` (repo has no plain-eyes session, ever)

## Why public

The repo holds **no secrets** (they live in Actions secrets), and public
repos get unlimited free Actions minutes. The reader code is not sensitive —
the session and callback secret are.
