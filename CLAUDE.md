# Workflow

This is a solo project. Keep everything on a single branch:

- Work directly on `main` in this checkout. Do not create feature branches or
  isolated worktrees for changes here, and do not open pull requests.
- Commit and push directly to `origin/main` after changes are verified
  (typecheck/build as applicable). `main` should always reflect the latest
  working state.
- If a background job or agent isolates into a worktree anyway, merge it back
  into `main` and delete the branch/worktree in the same session — never leave
  a branch open across sessions.
