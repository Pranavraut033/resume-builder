# Server Actions Documentation

## Overview

Server actions in this application handle **database operations only**. They use Prisma ORM to interact with SQLite and follow Next.js 14+ server action patterns.

## Core Principle

✅ **Server Actions = Database Operations**  
❌ **Server Actions ≠ LLM Operations**

All LLM operations happen client-side. See [CLIENT_SIDE_LLM.md](./CLIENT_SIDE_LLM.md) for details.

---

## File Structure

```
src/actions/
├── profile.ts    # Profile CRUD operations
└── job.ts        # Job, resume, and cover letter CRUD
```

---

## Profile Actions

**File**: `src/actions/profile.ts`

### `getProfile()`

Get the base profile or return default structure.

```typescript
import { getProfile } from '@/actions/profile';

const profile = await getProfile();

// Returns: ResumeJSON
// {
//   header: { name, email, phone?, location?, linkedin?, github?, website? },
//   summary: string,
//   experience: Experience[],
//   projects: Project[],
//   skills: string[],
//   education: Education[],
//   certifications: Certification[]
// }
```

**Database Operation**: `prisma.profile.findFirst()`

**Default Behavior**: Returns empty structure if no profile exists in database.

---

### `saveProfile()`

Save or update the base profile.

```typescript
import { saveProfile } from '@/actions/profile';

await saveProfile(resumeJson);
```

**Parameters**:
- `resumeJson: ResumeJSON` - Complete profile data

**Database Operations**: 
- `prisma.profile.create()` if no profile exists
- `prisma.profile.update()` if profile exists

**Side Effects**: Calls `revalidatePath('/profile')` to refresh UI

---

## Job Actions

**File**: `src/actions/job.ts`

### `createJob()`

Create a new job with pre-generated resume and cover letter.

```typescript
import { createJob } from '@/actions/job';

const { jobId } = await createJob({
  jobDetails: parsedJobDetails,      // From client-side LLM
  tailoredResume: generatedResume,   // From client-side LLM
  coverLetterText: coverLetter       // From client-side LLM
});
```

**Parameters**:
```typescript
{
  jobDetails: JobDetails;      // Parsed job information
  tailoredResume: ResumeJSON;  // Generated resume
  coverLetterText: string;     // Generated cover letter
}
```

**Database Operations**:
1. `prisma.job.create()` - Creates job record
2. `prisma.resume.create()` - Saves tailored resume
3. `prisma.coverLetter.create()` - Saves cover letter

**Returns**: `{ jobId: number }`

**Side Effects**: Calls `revalidatePath('/')` to refresh job list

**Important**: This action expects **pre-generated** data from client-side LLM operations. It does NOT generate resumes or parse job descriptions.

---

### `getAllJobs()`

Get all jobs ordered by creation date.

```typescript
import { getAllJobs } from '@/actions/job';

const jobs = await getAllJobs();

// Returns: Job[]
// {
//   id: number,
//   company: string,
//   role: string,
//   description: string,
//   status: string,
//   jobDetailsJson: string | null,
//   createdAt: string
// }
```

**Database Operation**: `prisma.job.findMany({ orderBy: { createdAt: 'desc' } })`

---

### `getJobById()`

Get a single job by ID.

```typescript
import { getJobById } from '@/actions/job';

const job = await getJobById(123);

// Returns: Job | null
```

**Database Operation**: `prisma.job.findUnique({ where: { id } })`

---

### `updateJobStatus()`

Update the status of a job.

```typescript
import { updateJobStatus } from '@/actions/job';

await updateJobStatus(123, 'Applied');
```

**Parameters**:
- `id: number` - Job ID
- `status: string` - New status (e.g., 'Draft', 'Applied', 'Interview', 'Offer', 'Rejected')

**Database Operation**: `prisma.job.update()`

**Side Effects**: Calls `revalidatePath('/')` and `revalidatePath(`/job/${id}`)`

---

### `deleteJob()`

Delete a job (cascade deletes resumes and cover letters).

```typescript
import { deleteJob } from '@/actions/job';

await deleteJob(123);
```

**Database Operation**: `prisma.job.delete({ where: { id } })`

**Side Effects**: 
- Automatically deletes related resumes and cover letters (Prisma cascade)
- Calls `revalidatePath('/')` to refresh job list

---

### `getResumeByJobId()`

Get the tailored resume for a job.

```typescript
import { getResumeByJobId } from '@/actions/job';

const resume = await getResumeByJobId(123);

// Returns: ResumeJSON | null
```

**Database Operation**: `prisma.resume.findFirst({ where: { jobId } })`

**Returns**: Parsed ResumeJSON or null if not found

---

### `updateResume()`

Update the resume content for a job.

```typescript
import { updateResume } from '@/actions/job';

await updateResume(123, updatedResumeJson);
```

**Parameters**:
- `jobId: number` - Job ID
- `contentJson: ResumeJSON` - Updated resume content

**Database Operation**: `prisma.resume.updateMany({ where: { jobId } })`

**Side Effects**: Calls `revalidatePath(`/resume/${jobId}`)`

---

### `getCoverLetterByJobId()`

Get the cover letter for a job.

```typescript
import { getCoverLetterByJobId } from '@/actions/job';

const coverLetter = await getCoverLetterByJobId(123);

// Returns: string | null
```

**Database Operation**: `prisma.coverLetter.findFirst({ where: { jobId } })`

---

### `updateCoverLetter()`

Update the cover letter text for a job.

```typescript
import { updateCoverLetter } from '@/actions/job';

await updateCoverLetter(123, updatedText);
```

**Parameters**:
- `jobId: number` - Job ID
- `contentText: string` - Updated cover letter text

**Database Operation**: `prisma.coverLetter.updateMany({ where: { jobId } })`

**Side Effects**: Calls `revalidatePath(`/cover-letter/${jobId}`)`

---

## Server Action Pattern

All server actions follow this structure:

```typescript
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function myAction(params) {
  // 1. Database operation using Prisma
  const result = await prisma.table.operation(...);
  
  // 2. Revalidate paths to refresh UI
  revalidatePath('/path');
  
  // 3. Return result
  return result;
}
```

**Key Points**:
- `'use server'` directive at top of file
- Import Prisma from `@/lib/prisma`
- Use `revalidatePath()` to refresh cached pages
- Return serializable data only (no functions, class instances, etc.)
- Keep operations atomic and focused

---

## Form Actions

Server actions can be used directly in forms:

```typescript
// In a server component
async function updateJobForm(id: number, formData: FormData) {
  'use server';
  
  const company = formData.get('company') as string;
  const role = formData.get('role') as string;
  
  await prisma.job.update({
    where: { id },
    data: { company, role }
  });
  
  revalidatePath('/');
  redirect('/');
}

// In JSX
<form action={updateJobForm.bind(null, jobId)}>
  <input name="company" />
  <input name="role" />
  <button type="submit">Update</button>
</form>
```

See [job/[id]/page.tsx](../src/app/job/[id]/page.tsx) for example.

---

## Error Handling

Server actions should handle errors gracefully:

```typescript
export async function myAction(params) {
  try {
    const result = await prisma.table.operation(...);
    return { success: true, data: result };
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, error: 'Operation failed' };
  }
}
```

**Client-side handling**:

```typescript
const result = await myAction(params);

if (!result.success) {
  alert(result.error);
  return;
}

// Use result.data
```

---

## Revalidation

Use `revalidatePath()` to refresh cached pages:

```typescript
import { revalidatePath } from 'next/cache';

// Revalidate specific path
revalidatePath('/jobs');

// Revalidate dynamic route
revalidatePath(`/job/${jobId}`);

// Revalidate entire layout
revalidatePath('/', 'layout');
```

**When to revalidate**:
- After creating records → revalidate list page
- After updating records → revalidate detail page
- After deleting records → revalidate list page

---

## Type Safety

Server actions maintain full type safety:

```typescript
// Define input/output types
type CreateJobInput = {
  jobDetails: JobDetails;
  tailoredResume: ResumeJSON;
  coverLetterText: string;
};

type CreateJobOutput = {
  jobId: number;
};

export async function createJob(
  input: CreateJobInput
): Promise<CreateJobOutput> {
  // Implementation
}
```

**Benefits**:
- TypeScript checks at compile time
- Auto-complete in IDEs
- Catch errors before runtime
- Self-documenting code

---

## Testing Server Actions

Server actions can be tested directly:

```typescript
import { createJob } from '@/actions/job';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      create: jest.fn().mockResolvedValue({ id: 1 })
    }
  }
}));

test('createJob creates job in database', async () => {
  const result = await createJob({
    jobDetails: mockJobDetails,
    tailoredResume: mockResume,
    coverLetterText: mockCoverLetter
  });
  
  expect(result.jobId).toBe(1);
  expect(prisma.job.create).toHaveBeenCalled();
});
```

---

## Best Practices

1. **Keep It Simple**: One action = one responsibility
2. **Database Only**: No LLM calls, no complex business logic
3. **Revalidate Paths**: Always revalidate after mutations
4. **Error Handling**: Catch and return errors gracefully
5. **Type Safety**: Use explicit types for inputs and outputs
6. **Atomic Operations**: Complete operations or rollback
7. **No Side Effects**: Avoid non-database side effects
8. **Serializable Returns**: Return JSON-compatible data only

---

## Common Mistakes

❌ **Wrong - LLM in Server Action**:
```typescript
export async function createJob(description: string) {
  'use server';
  const provider = new OpenAIProvider(apiKey); // ❌ NO!
  const jobDetails = await provider.parse(description);
  // ...
}
```

✅ **Correct - LLM on Client, Server Action for DB**:
```typescript
// Client component
const jobDetails = await parseJobDescription(...); // Client-side LLM
await createJob({ jobDetails, ... }); // Server action for DB
```

---

❌ **Wrong - Accessing Request in Server Action**:
```typescript
export async function getJobs(request: Request) { // ❌ NO!
  'use server';
  const cookies = request.cookies;
  // ...
}
```

✅ **Correct - Use cookies() helper**:
```typescript
import { cookies } from 'next/headers';

export async function getJobs() {
  'use server';
  const cookieStore = cookies();
  // ...
}
```

---

## Related Documentation

- [Prisma Schema](../prisma/schema.prisma)
- [Client-Side LLM Operations](./CLIENT_SIDE_LLM.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Next.js Server Actions Docs](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
