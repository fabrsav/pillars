Auto Sync behavior

This repository includes an automatic watcher that commits and pushes local changes to the configured remote. It is intended to make local → remote synchronization simple, and by default it is conservative about avoiding accidental remote history rewrites.

Configuration

- AUTOSYNC_FORCE_PUSH
  - Default: enabled (truthy by default in the watcher) — **uses `--force-with-lease`** which is safer than `--force`.
  - To disable forcing pushes set `AUTOSYNC_FORCE_PUSH=0` in your environment.

- AUTOSYNC_TARGET_BRANCH
  - Default: `HEAD` (keeps behavior consistent with current branch). Set to `main` to always push to `main`.

Notes & recommendations

- The watcher uses `--force-with-lease` by default to ensure local changes propagate to the remote while avoiding unintentionally overwriting changes made by others.
- If you absolutely want the older aggressive behavior, set `AUTOSYNC_FORCE_PUSH=1` and the watcher will use the configured forced option.
- The `sync` npm script also uses `--force-with-lease` to make programmatic syncs safer.

If you'd like the watcher to never force-push by default, set `AUTOSYNC_FORCE_PUSH=0` in your environment or let me change the default behavior in the script.
