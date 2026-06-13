# Quick Reference: ESLint & Prettier

## 🚀 Daily Workflow

```bash
# Before committing
npm run lint:fix && npm run format && npm run type-check
```

## 📋 Commands

| Command                | Description                       |
| ---------------------- | --------------------------------- |
| `npm run lint`         | Check for code quality issues     |
| `npm run lint:fix`     | Auto-fix ESLint issues            |
| `npm run format`       | Format code with Prettier         |
| `npm run format:check` | Verify formatting without changes |
| `npm run type-check`   | Check TypeScript types            |

## 🔧 VS Code Setup

### Auto-Format on Save

Already configured! Just save files (Cmd+S)

### Manual Format

- Format Document: `Cmd+Shift+P` → "Format Document"
- Format Selection: `Cmd+K Cmd+F`

### View Problems

- Problems Panel: `Cmd+Shift+M`
- Inline with Error Lens extension

## 📝 Common Fixes

### Remove unused variable

```typescript
// ❌ Error: 'foo' is defined but never used
const foo = 123;

// ✅ Fix 1: Remove it
// (delete the line)

// ✅ Fix 2: Prefix with _ if intentional
const _foo = 123;
```

### Replace `any` type

```typescript
// ❌ Error: Unexpected any
function process(data: any) {}

// ✅ Fix: Use specific type
function process(data: string | number) {}
function process(data: unknown) {} // if type truly unknown
```

### Fix console statements

```typescript
// ❌ Warning: console not allowed
console.log("Debug info");

// ✅ Fix: Use warn/error or remove
console.warn("Warning message");
console.error("Error occurred");
```

### Strict equality

```typescript
// ❌ Error: Use === instead of ==
if (value == null) {
}

// ✅ Fix: Use ===
if (value === null) {
}
```

### Unused imports

```typescript
// ❌ Error: 'useState' is defined but never used
import { useState, useEffect } from "react";

// ✅ Fix: Remove unused import
import { useEffect } from "react";
```

## 🎨 Prettier Rules

- **Line Length**: 80 characters
- **Indentation**: 2 spaces
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Trailing Commas**: ES5
- **Tailwind Classes**: Auto-sorted

## 🔍 Ignoring Rules

### Single line

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;
```

### Multiple lines

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
const a: any = 1;
const b: any = 2;
/* eslint-enable @typescript-eslint/no-explicit-any */
```

### Entire file (avoid!)

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
```

## 🏃 Quick Fixes

### Auto-fix everything possible

```bash
npm run lint:fix && npm run format
```

### Check before committing

```bash
npm run lint && npm run format:check && npm run type-check
```

### View what would be formatted

```bash
npx prettier --check .
```

## 📦 Extensions Installed

✅ ESLint  
✅ Prettier  
✅ Tailwind CSS IntelliSense  
✅ Prisma  
✅ Tauri  
✅ Error Lens  
✅ TypeScript Nightly

## ⚡ Keyboard Shortcuts

| Action          | Shortcut               |
| --------------- | ---------------------- |
| Format Document | `Cmd+Shift+P` → Format |
| Show Problems   | `Cmd+Shift+M`          |
| Quick Fix       | `Cmd+.`                |
| Save & Format   | `Cmd+S` (automatic)    |

## 🐛 Troubleshooting

### ESLint not working

```bash
# Reload VS Code
Cmd+Shift+P → "Reload Window"
```

### Prettier not formatting

```bash
# Check default formatter
Cmd+Shift+P → "Format Document With..." → "Prettier"
```

### Still seeing errors after fix

```bash
# Regenerate cache
rm -rf .next
npm run lint:fix
```

---

**Need help?** See [.eslintrc.README.md](./.eslintrc.README.md) for detailed docs.
