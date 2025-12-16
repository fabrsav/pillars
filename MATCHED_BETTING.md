Matched betting email checker

This project includes a simple IMAP-based email checker to find potential matched-betting offers in a Gmail account.

How it works

- Connects via IMAP to an account (Gmail's IMAP host: `imap.gmail.com:993`).
- Searches messages from the last N days (default 7).
- Uses heuristics to detect "free bet" / "welcome offer" / "bonus" emails and extract amounts and odds.
- Returns a list of detected offers with a simple estimated gain.

Setup

Preferred: create an app password for the Gmail account (requires 2FA) and set the following env vars:

- `MATCHED_EMAIL` (e.g., fabmatchedbetting@gmail.com)
- `MATCHED_EMAIL_PASSWORD` (app password)

Alternatively, provide `email` and `password` in the POST request body (not recommended for long-term storage).

API

POST /api/matched-betting/check-emails
- Protected by `PILLARS_TOKEN` auth when configured. Include header `Authorization: Bearer <token>`.
- Body (JSON): `{ "email": "...", "password": "...", "days": 7 }` (all fields optional if env vars provided).
- Response: `{ success: true, offers: [ { subject, from, date, freeBet, odds, estimatedGain } ], checkedDays: 7 }

Notes & Security

- This is a heuristic helper, not a complete matched-betting calculator. Estimated gains are approximations (e.g., for a free bet the profit is approximated as `freeBet * (odds - 1)` when odds are present, otherwise a fallback estimate is used).
- Do not commit real credentials to the repository. Use environment variables or a secure secrets manager.
- For production-level reliability and better privacy, consider implementing OAuth2 via Google's API instead of IMAP/app-passwords.
