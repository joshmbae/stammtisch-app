# Workflow

This is a solo project. Default to working directly on `main` for small,
self-contained changes:

- For small/self-contained changes: work directly on `main`, commit and push
  to `origin/main` after changes are verified (typecheck/build as applicable).
- For larger, multi-file features (e.g. touching several screens, adding
  database migrations, or spanning multiple sessions): use a short-lived
  feature branch (`feature/<name>`). Work through it incrementally with
  regular commits, verify (typecheck/build, manual test in simulator/Expo Go),
  then merge back into `main` and delete the branch — do not leave a feature
  branch open across sessions once the work is done. Do not open pull
  requests; merge locally.
- If a background job or agent isolates into a worktree, merge it back into
  `main` (or the active feature branch) and delete the branch/worktree in the
  same session — never leave a branch open across sessions.
- `main` should always reflect a working state; feature branches may be
  temporarily broken between commits, `main` should not be.
