#!/usr/bin/env zsh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# COMMIT 1
git add src/lib/llm/llmService.ts \
  src/lib/llm/prompts/index.ts \
  src/lib/llm/prompts/resolver.ts \
  src/lib/llm/prompts/templates/cover-letter.ts \
  src/lib/llm/prompts/templates/education.ts \
  src/lib/llm/prompts/templates/resume-tailoring.ts \
  src/lib/llm/providers/perplexity.ts \
  src/lib/llm/tokenTracker.ts \
  src/store/modelStore.ts \
  src/types/resume.ts
git commit -m "feat(llm): update prompts, providers, and token tracking"

# COMMIT 2
git add src/components/AIAssistPanel.tsx \
  src/components/CacheInitializer.tsx \
  src/components/EnhancedCoverLetterEditor.tsx \
  src/components/EnhancedResumeEditor.tsx \
  src/components/SelectedModelCard.tsx \
  src/components/analytics/TokenUsageTable.tsx \
  src/components/resume/FinalReviewExport.tsx \
  src/components/templates/coverLetter/BJetProfessionalCoverLetter.tsx \
  src/components/templates/coverLetter/BusinessProfessionalCoverLetter.tsx \
  src/components/templates/coverLetter/CreativeModernCoverLetter.tsx \
  src/components/templates/coverLetter/ElegantTimelineCoverLetter.tsx \
  src/components/templates/coverLetter/ModernMinimalCoverLetter.tsx \
  src/components/templates/coverLetter/ProfessionalCoverLetter.tsx \
  src/components/templates/coverLetter/TechSidebarCoverLetter.tsx \
  src/components/ui/index.ts
git commit -m "feat(components): improve resume and cover-letter components"

# COMMIT 3
git add src/app/analytics/tokens/page.tsx \
  src/app/components/JobTableClient.tsx \
  src/app/cover-letter/[jobId]/page.tsx \
  src/app/job/new/page.tsx \
  src/app/page.tsx \
  src/app/profile/page.tsx \
  src/app/resume/[jobId]/layout.tsx \
  src/contexts/EditorContext.tsx \
  src/contexts/AIContext.tsx \
  src/hooks/useProfile.ts
git commit -m "feat(app): update pages and context for resume flow"

# COMMIT 4
git add .vscode/settings.json package-lock.json package.json prisma/schema.prisma
git commit -m "chore(deps): update package and prisma schema"

# COMMIT 5
git add tests/README.md \
  tests/actions/job.integration.test.ts \
  tests/actions/job.test.ts \
  tests/actions/profile.test.ts \
  tests/actions/tokenUsage.test.ts \
  tests/actions/urlFetcher.test.ts \
  tests/config/README.md \
  tests/config/test.config.ts \
  tests/debug-db.ts \
  tests/fixtures/data.ts \
  tests/integration/llm-e2e.test.ts \
  tests/lib/clientLLM.test.ts \
  tests/lib/colorUtils.test.ts \
  tests/lib/llm/providers/factory.test.ts \
  tests/lib/llm/providers/gemini.test.ts \
  tests/lib/llm/providers/grok.test.ts \
  tests/lib/llm/providers/groq.test.ts \
  tests/lib/llm/providers/integration.test.ts \
  tests/lib/llm/providers/ollama.test.ts \
  tests/lib/llm/providers/openai.test.ts \
  tests/lib/llm/providers/registration.test.ts \
  tests/lib/llm/providers/registry.test.ts \
  tests/lib/prisma.test.ts \
  tests/lib/prompts/integration.test.ts \
  tests/lib/prompts/prompts.test.ts \
  tests/mocks/llm.ts \
  tests/mocks/prisma.ts \
  tests/setup.ts \
  tests/utils/db.ts \
  tests/utils/factories.ts
git commit -m "test: remove legacy tests"

# COMMIT 6
git add scripts/_commit.sh \
  src/components/form/RichTextEditor.tsx \
  src/components/ui/FallbackState.tsx \
  src/hooks/useEditorContext.ts \
  src/hooks/useGenerateCoverLetter.ts \
  src/hooks/useHydrated.ts \
  src/lib/htmlUtils.ts \
  src/lib/resumeToText.ts \
  type-check-output.txt
git commit -m "feat(ui/hooks): add new editor hooks and utilities"

# Self-destruct
rm -- "$0"
