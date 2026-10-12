# Source

- Upstream: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT, see `LICENSE`)
- Imported from commit `026b6e172c47fa09246b89b6e1d414b8e15f1057` (2026-10-12), folder `.claude/skills/ui-ux-pro-max`
- Local changes:
  - removed `scripts/tests/` (upstream test suite, not needed at runtime)
  - script paths in `SKILL.md` point to `.claude/skills/ui-ux-pro-max/scripts/search.py` (run from the repo root) instead of `${CLAUDE_PLUGIN_ROOT}/…`
- Reviewed before import: scripts use only the Python standard library, make no network calls and only write files when `--persist` is passed.
