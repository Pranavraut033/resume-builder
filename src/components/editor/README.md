# Shared Editor Components

This directory contains reusable components shared between Resume Editor and Cover Letter Editor, following the DRY (Don't Repeat Yourself) principle.

## Architecture

### EditorContext (`src/contexts/EditorContext.tsx`)

Unified context provider for both Resume and Cover Letter editors.

**Usage:**

```tsx
import { EditorProvider, useEditorContext } from "@/contexts/EditorContext";

function MyEditor() {
  return (
    <EditorProvider contentType="resume">
      {" "}
      {/* or "coverLetter" */}
      <EditorContent />
    </EditorProvider>
  );
}

function EditorContent() {
  const { resume, coverLetter, customization, updateCustomization } =
    useEditorContext();
  // ...
}
```

**State Managed:**

- Content (resume or cover letter)
- Job context
- Customization (template, theme, colors, fonts)
- LLM generation state
- Loading and error states

## Components

### EditorLayout

Provides consistent layout structure for all editors.

**Props:**

```typescript
interface EditorLayoutProps {
  title: string;
  leftPanel: ReactNode; // Editor controls/content
  rightPanel: ReactNode; // Preview or side panel
  onPreviewToggle?: (isPreview: boolean) => void;
  initialPreviewMode?: boolean;
}
```

**Features:**

- Sticky header with back button
- Edit/Preview toggle
- Responsive layout (mobile/desktop)
- Consistent styling

**Example:**

```tsx
import { EditorLayout } from "@/components/editor";

<EditorLayout
  title="Resume Editor"
  leftPanel={<ResumeEditor />}
  rightPanel={<SidePanel />}
/>;
```

### EditorSidePanel

Unified customization panel for editors.

**Props:**

```typescript
interface EditorSidePanelProps {
  customization: ResumeCustomization;
  onCustomizationChange: (updates: Partial<ResumeCustomization>) => void;
  exportOptions: Array<{
    label: string;
    icon: IconName;
    description: string;
    onExport: () => void;
  }>;
  onPreview?: () => void;
  additionalContent?: ReactNode;
}
```

**Features:**

- Template selection
- Theme picker (8 presets + custom)
- Color customizer
- Font selector (20+ fonts)
- Export dropdown
- Extensible with additional content

**Example:**

```tsx
import { EditorSidePanel } from "@/components/editor";

<EditorSidePanel
  customization={customization}
  onCustomizationChange={handleChange}
  exportOptions={[
    {
      label: "PDF",
      icon: "download",
      description: "Export as PDF",
      onExport: handlePDF,
    },
  ]}
  additionalContent={<ATSPanel />}
/>;
```

## Design Principles

### 1. Single Responsibility

Each component has a clear, focused purpose.

### 2. Composition Over Inheritance

Components are composed together rather than extended.

### 3. Prop-Based Configuration

Behavior is controlled through props, not internal state when possible.

### 4. Type Safety

All components are fully typed with TypeScript.

### 5. Accessibility

- Semantic HTML
- Keyboard navigation
- ARIA labels
- Focus management

### 6. Theme Support

- Dark mode compatible
- Color system tokens
- Consistent spacing

## Integration

### Resume Editor

```tsx
<EditorProvider contentType="resume">
  <EditorLayout
    title="Resume Editor"
    leftPanel={<ResumeEditor />}
    rightPanel={<EditorSidePanel {...props} />}
  />
</EditorProvider>
```

### Cover Letter Editor

```tsx
<EditorProvider contentType="coverLetter">
  <EditorLayout
    title="Cover Letter Editor"
    leftPanel={<CoverLetterEditor />}
    rightPanel={<EditorSidePanel {...props} />}
  />
</EditorProvider>
```

## Benefits

✅ **Zero Duplication** - Logic written once, used everywhere
✅ **Consistent UX** - Same patterns across all editors
✅ **Easy Maintenance** - Update once, applies everywhere
✅ **Type Safety** - Full TypeScript coverage
✅ **Testability** - Components are independently testable
✅ **Extensibility** - Easy to add new features or editors

## Future Extensions

- New editor types (bio, portfolio)
- Additional customization options
- Real-time collaboration
- Version history
- Templates marketplace
