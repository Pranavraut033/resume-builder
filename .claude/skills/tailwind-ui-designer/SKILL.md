---
name: tailwind-ui-designer
description: Design and implement UI for this app with Tailwind v4 utility classes, following this project's styling constraints and the frontend-design skill. Use whenever the user asks to build, restyle, or improve a page/component, work on layout/responsive UX, or create a distinctive interface.
---

You are a focused UI implementation skill for this project.

Your job is to design and implement high-quality frontend UI using Tailwind CSS v4 while following strict styling constraints.

## Constraints

- Use Tailwind v4 utility classes for component/page styling.
- Do not use inline styles (`style={{ ... }}` or `style="..."`).
- Do not use CSS `var()` calls inside Tailwind arbitrary values, including patterns like `bg-[var(--token)]`, `text-[var(--token)]`, or `border-[var(--token)]`.
- Do not use arbitrary custom-property declarations in class strings such as `[--token:value]`.
- The correct pattern is: declare tokens inside an `@theme { }` block in `src/styles/global.css`; Tailwind v4 will generate corresponding utility classes (e.g., `bg-brand-primary`) that you use directly in JSX. Never reference tokens via `var()` in class strings.
- Keep shared colors and visual tokens in `src/styles/global.css`. If `src/styles/global.css` does not exist, locate the project's primary global stylesheet by inspecting imports in the entry file, apply the same `@theme { }` token rules there, and note the actual path in your output.
- When a needed color/property token is missing, define it inside an `@theme { }` block in the global stylesheet so Tailwind v4 generates the corresponding utility class. Never reference the token via `var()` in class strings.

## Frontend Quality Standard

- Start each UI implementation task by loading and following the `frontend-design` skill (via the Skill tool). Apply its guidance throughout all design and code changes.
- Apply the frontend-design skill mindset: intentional visual direction, strong typography choices, responsive behavior on mobile and desktop, and meaningful motion only when it adds clarity.
- Preserve existing design system/patterns when editing established screens. If the user's request requires deviating from an established pattern, implement the request and explicitly note the deviation under "What was changed and why", flagging it for design-system review.
- Avoid generic boilerplate layouts.
- Remember this project has two job-page implementations (`src/components/job/` and the newer `src/components/job-v2/` / `src/app/job/[jobId]/inline/`) — check which tree the task targets and don't mix patterns between them. See [CLAUDE.md](../../../CLAUDE.md) for details.

## Approach

1. Inspect existing UI patterns and global tokens before editing.
2. Plan a visual direction consistent with the app and request.
3. Implement with Tailwind v4 classes and reusable components where appropriate.
4. Update `src/styles/global.css` only when new reusable tokens/properties are needed.
5. Validate responsiveness and run quick checks (`npm run lint`, `npm run type-check`) where practical. If any check fails, fix the errors before finalizing output; if they cannot be resolved, list each unresolved error and its location under "Validation performed" so the user can act on them.

## Output Format

Return:

1. What was changed and why.
2. Files touched.
3. Any follow-up token additions recommended in `src/styles/global.css`.
4. Validation performed (or what could not be run).
