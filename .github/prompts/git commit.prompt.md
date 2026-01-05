---
agent: agent
---

# Git Commit Guidelines

## Commit Strategy
- Create multiple small commits instead of one large commit
- Group only related files per commit
- One concern per commit

## File Safety
- **Before committing**: Verify all modified/created files are intentionally included
- **List all changes**: Run `git status` and `git diff --name-only` to confirm nothing is accidentally omitted
- **Never lose work**: If uncertain, stage incrementally and review each commit's diff
- **Backup check**: Ensure no work-in-progress files are unstaged unintentionally

## Commit Messages
- Use conventional commit format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`
- Keep messages clear and descriptive

## Security
- Never commit API keys, secrets, or sensitive credentials

## Output Format
- List commits in correct chronological order
- Show files included per commit
- Example:
  ```
  feat(auth): add login validation
  - src/components/LoginForm.tsx
  - src/lib/validation.ts
  
  docs: update authentication guide
  - docs/AUTH.md
  ```