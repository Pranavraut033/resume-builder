# Changelog

## [2.0.0] - 2025-12-21 - Major Architecture Refactoring

### Breaking Changes

Complete architecture overhaul from REST API + Drizzle ORM to Server Actions + Prisma ORM + Client-Side LLM.

### Added

#### New Architecture
- **Server Actions**: All database operations now use Next.js Server Actions
- **Prisma ORM**: Replaced Drizzle ORM with Prisma 5.22.0
- **Client-Side LLM**: All LLM operations moved to client-side module
- **Type Safety**: Full end-to-end type safety with Prisma generated types

#### New Files
- `src/actions/profile.ts` - Profile CRUD operations
- `src/actions/job.ts` - Job, Resume, Cover Letter CRUD operations
- `src/lib/clientLLM.ts` - Client-side LLM operations module
- `src/lib/prisma.ts` - Prisma client singleton
- `prisma/schema.prisma` - Prisma database schema
- `.env` - Environment configuration with DATABASE_URL

#### New Documentation
- `docs/CLIENT_SIDE_LLM.md` - Complete guide to client-side LLM operations
- `docs/SERVER_ACTIONS.md` - Server actions documentation
- `docs/MIGRATION_GUIDE.md` - Migration guide from old to new architecture
- `docs/CHANGELOG.md` - This file
- `ARCHITECTURE.md` - Complete architecture documentation
- `RESTRUCTURING_SUMMARY.md` - Migration summary

### Changed

#### Architecture Changes
- **Database Access**: Changed from Drizzle `db.select()` to Prisma `prisma.findMany()`
- **API Layer**: Removed all REST API routes, replaced with direct server action calls
- **LLM Operations**: Moved from mixed client/server to purely client-side
- **State Management**: Removed React Query, using direct server actions
- **Model Fetching**: Changed from server action + cache to client-side function

#### Updated Components
- `src/app/page.tsx` - Using Prisma directly in server component
- `src/app/profile/page.tsx` - Calls server actions instead of React Query hooks
- `src/app/settings/page.tsx` - Uses client-side `fetchModels()` instead of server action
- `src/app/job/new/page.tsx` - Performs LLM operations client-side, then saves via server action
- `src/app/job/[id]/page.tsx` - Uses server actions for database operations
- `src/app/resume/[jobId]/page.tsx` - Loads resume via server action
- `src/app/cover-letter/[jobId]/page.tsx` - Loads/saves via server actions
- `src/components/ResumeEditor.tsx` - Updated to use server actions
- `src/components/CoverLetterEditor.tsx` - Updated to use server actions
- `src/app/layout.tsx` - Removed QueryProvider wrapper
- `src/components/ui/Block.tsx` - Fixed TypeScript errors using `createElement()`

#### Updated Configuration
- `package.json` - Updated scripts for Prisma (`db:generate` → `npx prisma generate`)
- `package.json` - Added Prisma dependencies, removed Drizzle/axios/React Query
- `.gitignore` - Added Prisma and Next.js build artifacts

#### Updated Documentation
- `README.md` - Completely rewritten with architecture details
- `requirements.md` - Updated architecture description
- `agents.md` - Updated with client-side LLM rules
- `.github/copilot-instructions.md` - Updated architecture patterns
- `STATUS.md` - Added architecture migration entries

### Removed

#### Deleted Files
- `src/app/api/job/route.ts` - Job API route
- `src/app/api/profile/route.ts` - Profile API route
- `src/app/api/models/route.ts` - Models API route
- `src/app/api/models/refresh/route.ts` - Model refresh API route
- `src/lib/api.ts` - HTTP client wrapper
- `src/lib/api.example.ts` - API client example
- `src/lib/apiHooks.ts` - React Query hooks
- `src/components/QueryProvider.tsx` - React Query provider
- `src/db/index.ts` - Drizzle database connection
- `src/db/schema.ts` - Drizzle schema
- `drizzle/` - Drizzle migrations directory
- `drizzle.config.ts` - Drizzle configuration
- `src/actions/models.ts` - Server-side model cache actions
- `src/lib/modelCache.ts` - Model cache service

#### Removed Dependencies (122 packages)
- `drizzle-orm` - Replaced with Prisma
- `drizzle-kit` - Replaced with Prisma CLI
- `better-sqlite3` - Using Prisma's SQLite adapter
- `axios` - No longer needed (no HTTP calls)
- `@tanstack/react-query` - No longer needed (direct server actions)
- `@tanstack/react-query-devtools` - No longer needed

### Fixed

#### TypeScript Errors
- Fixed `Block.tsx` using `any` type - replaced with `createElement()` pattern
- Fixed `keyStorage.ts` null handling - added proper null checks
- All type checks now pass successfully

#### Architecture Issues
- **API Key Access**: Fixed by moving LLM operations to client-side where Tauri storage is accessible
- **Server Action Complexity**: Simplified by removing all LLM logic, keeping only database operations
- **Type Safety**: Improved with Prisma generated types

### Security

- **API Keys**: Now stored exclusively client-side in Tauri encrypted storage
- **No Network Transmission**: API keys never sent to server
- **Prisma Protection**: Built-in SQL injection protection with parameterized queries

### Performance

- **Reduced Overhead**: No HTTP serialization for internal API calls
- **Fewer Dependencies**: Removed 122 unnecessary packages
- **Faster Builds**: Simplified dependency tree
- **Better Caching**: Native Next.js caching with `revalidatePath()`

### Migration Path

For users upgrading from v1.x:

1. **Backup Data**: Export existing jobs/profile before upgrading
2. **Install Dependencies**: Run `npm install` to get Prisma
3. **Generate Prisma Client**: Run `npx prisma generate`
4. **Push Schema**: Run `npx prisma db push`
5. **Test**: Verify existing data migrated correctly
6. **Update API Keys**: Re-enter API keys in `/settings` (Tauri storage format changed)

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed instructions.

---

## Architecture Evolution

### v1.x (Old Architecture)

```
Client → axios → REST API (/api/*) → Drizzle → SQLite
       → React Query for state management
       → Mixed LLM operations (client/server)
```

**Issues**:
- API keys accessed server-side (incompatible with Tauri storage)
- Unnecessary HTTP layer for internal calls
- Complex state management with React Query
- Mixed concerns in API routes (database + LLM + business logic)

### v2.0 (New Architecture)

```
Client → Server Actions → Prisma → SQLite
       → Client-Side LLM (with Tauri key storage)
       → Direct state management
```

**Benefits**:
- API keys stay client-side (secure, Tauri-compatible)
- No HTTP overhead for internal calls
- Clear separation: Server = Database, Client = LLM + UI
- Simpler codebase (~200 lines removed)
- Better type safety with Prisma
- Modern Next.js patterns

---

## Testing Checklist

After migration, verify:

- [ ] `npm run type-check` passes
- [ ] `npm run dev` starts successfully
- [ ] Profile page loads and saves data
- [ ] Settings page loads and saves API keys
- [ ] Job creation workflow completes (parsing + generation + save)
- [ ] Resume editor loads and saves changes
- [ ] Cover letter editor loads and saves changes
- [ ] PDF export works correctly
- [ ] TXT export works correctly
- [ ] Tauri desktop app builds (`npm run tauri build`)
- [ ] API key storage works in Tauri
- [ ] All LLM providers work (OpenAI, Gemini, Grok, Ollama)

---

## Known Issues

None at this time. All type checks pass and architecture is stable.

---

## Future Roadmap

- [ ] Streaming LLM responses for better UX
- [ ] Dynamic model fetching from providers
- [ ] Background job processing with Web Workers
- [ ] Client-side caching for parsed jobs
- [ ] Retry logic for transient LLM failures
- [ ] Google Drive backup integration
- [ ] Multi-profile support
- [ ] Resume templates
- [ ] Cover letter templates
- [ ] Application tracking automation

---

## Contributors

This major refactoring was completed on 2025-12-21.

---

## Version History

- **2.0.0** (2025-12-21) - Major architecture refactoring
- **1.x** - Original implementation with REST API + Drizzle
