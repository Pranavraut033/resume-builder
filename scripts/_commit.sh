#!/usr/bin/env zsh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# COMMIT 1: Migrate to unified job page architecture
git add src/app/job/\[id\]/page.tsx src/app/job/\[jobId\]/ src/app/cover-letter/\[jobId\]/page.tsx src/app/resume/\[jobId\]/page.tsx src/contexts/JobPageContext.tsx src/hooks/useJobPageDataQuery.ts src/actions/job.ts
git commit -m "refactor: migrate to unified job page architecture"

# COMMIT 2: Consolidate resume and cover letter editor components
git add src/components/EnhancedResumeEditor.tsx src/components/EnhancedCoverLetterEditor.tsx src/components/ResumeCustomizationPanel.tsx src/components/ResumeSidePanel.tsx src/components/ResumePreviewModal.tsx src/components/ResumeEditor.tsx src/components/CoverLetterEditor.tsx src/components/EditorLayout/ src/components/ui/SaveButton.tsx
git commit -m "refactor: consolidate resume and cover letter editor components"

# COMMIT 3: Extract customization types and update context hooks
git add src/types/customization.ts src/hooks/useProfileQuery.ts src/hooks/useResolveCustomization.ts src/hooks/useEditorContext.ts src/hooks/useProfile.ts src/contexts/EditorContext.tsx src/contexts/ResumeEditContext.tsx
git commit -m "refactor: extract customization types and update context hooks"

# COMMIT 4: Update templates for new customization system
git add src/components/templates/BJetProfessionalTemplate.tsx src/components/templates/BusinessProfessionalTemplate.tsx src/components/templates/CreativeModernTemplate.tsx src/components/templates/ElegantTimelineTemplate.tsx src/components/templates/ModernMinimalTemplate.tsx src/components/templates/TechSidebarTemplate.tsx src/components/templates/TemplateRenderer.tsx src/components/templates/coverLetter/
git commit -m "refactor: update templates for new customization system"

# COMMIT 5: Update utilities and types for resume handling
git add src/lib/htmlUtils.ts src/lib/resumeToText.ts src/lib/getFulllUrl.ts src/lib/index.ts src/types/resume.ts src/components/form/RichTextEditor.tsx src/components/form/RichTextEditorContent.tsx src/components/editor/README.md
git commit -m "refactor: update utilities and types for resume handling"

# COMMIT 6: Update schema for resume customization support
git add prisma/schema.prisma
git commit -m "refactor: update schema for resume customization support"

# COMMIT 7: Update model and font selectors
git add src/components/ModelSelector.tsx src/components/FontSelector.tsx src/components/SelectedModelCard.tsx src/components/TemplateSelector.tsx
git commit -m "refactor: update model and font selectors"

# COMMIT 8: Update dependencies
git add package.json package-lock.json
git commit -m "chore: update dependencies"

# COMMIT 9: Update app shell and pages for new structure
git add src/components/AppShell.tsx src/app/components/JobTableClient.tsx src/app/profile/page.tsx src/app/job/new/page.tsx src/styles/
git commit -m "refactor: update app shell and pages for new structure"

# Self-destruct
rm -- "$0"
