# Aggressive Branch Scan — Summary (2025-12-16)

Report: `branch-reports/report-aggressive-14.json`

## Flagged branches (summary)

- origin/wip/refund-manager-refactor — pattern: `wip`
  - Age: 0 days, NOT merged to `main`.
  - Recommendation: likely active; leave as-is or encourage creating a short-lived `feature/` branch and open PR when ready.

- origin/integration/merge-all-branches-2025-12-12 — pattern: `merge`
  - Age: 4 days, NOT merged to `main`.
  - Recommendation: review contents; if integration was done, create a clean PR or merge; otherwise, keep as coordination branch but consider renaming.

- origin/merge/wip-squash-clean — patterns: `merge`, `wip`
  - Age: 4 days, MERGED into `main`.
  - Recommendation: can be safely deleted from remote (branch merged).

- origin/merge/wip-squash-from-main — patterns: `merge`, `wip`
  - Age: 4 days, MERGED into `main`.
  - Recommendation: can be safely deleted from remote (branch merged).

- origin/copilot/* (4 branches)
  - `origin/copilot/remove-api-key-request` — age 5 days, unmerged
  - `origin/copilot/change-encryption-password` — age 6 days, unmerged
  - `origin/copilot/fix-groq-api-issues` — age 6 days, unmerged
  - `origin/copilot/adapt-mobile-screen-display` — age 6 days, merged
  - Recommendation: "copilot/" prefix indicates AI-assist or work-in-progress; if these branches are transient, ask owners to open PRs with clear names (e.g., `feature/…`) or delete the merged ones. For unmerged branches, check PR status and author intent.

## Observations
- No branches older than the strict thresholds were found; most flagged items are due to naming (`wip`, `merge`, `copilot`) rather than long inactivity.
- Two `merge/*` branches are already merged and can be cleaned up safely.

## Recommended actions (proposed)
1. Delete remote branches that are merged and not needed anymore (e.g., `origin/merge/wip-squash-clean`, `origin/merge/wip-squash-from-main`).
2. For `copilot/*` branches and others prefixed with `wip/` or `merge/`, open a short issue or ping the authors to decide whether to keep, rename, or create PRs.
3. Enforce branch naming policy via `CONTRIBUTING.md` and consider lightweight automation: a GitHub Action that opens a reminder issue for branches matching `wip`/`merge`/`copilot` names after e.g. 14 days.
4. After owners confirm, delete unwanted merged/obsolete branches.

---

Se vuoi, posso procedere automaticamente con le azioni non distruttive (es. creare issue, aprire PR con suggerimenti di rinomina, o programmare la cancellazione dei branch **già merged**). Confermi che proceda con l'applicazione di queste modifiche (cancellazioni controllate e notifiche)?