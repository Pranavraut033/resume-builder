# Client-Side LLM Operations

## Overview

All LLM (Large Language Model) operations in this application run **client-side** in the browser/Tauri context. This architectural decision ensures API keys remain secure and accessible only where they're stored (Tauri storage).

## Architecture

```
┌─────────────────────────────────────────┐
│  Client (Browser/Tauri)                 │
│  ├─ UI Components                       │
│  ├─ clientLLM.ts (All LLM ops)          │
│  │   ├─ parseJobDescription()           │
│  │   ├─ generateResume()                │
│  │   ├─ generateCoverLetter()           │
│  │   └─ fetchModels()                   │
│  └─ keyStorage.ts (Tauri storage)       │
└────────────┬────────────────────────────┘
             │
             │ Server Actions (Database only)
             ▼
┌─────────────────────────────────────────┐
│  Server (Next.js)                       │
│  ├─ actions/ (Prisma only)              │
│  │   ├─ Profile CRUD                    │
│  │   ├─ Job CRUD                        │
│  │   └─ Resume/Cover Letter CRUD        │
│  └─ Prisma + SQLite                     │
└─────────────────────────────────────────┘
```

## Why Client-Side?

1. **API Key Security**: Keys stored in Tauri storage are only accessible from client context
2. **No Network Transmission**: Keys never sent to server over network
3. **Tauri Compatibility**: LLM providers work correctly in desktop environment
4. **Clear Separation**: Server = Database, Client = LLM + UI
5. **Provider Requirements**: Some providers (like Ollama) run locally and need client access

## Client LLM Module

**File**: `src/lib/clientLLM.ts`

### Functions

#### `parseJobDescription()`
Parse a job description using LLM to extract structured data.

```typescript
import { parseJobDescription } from '@/lib/clientLLM';

const jobDetails = await parseJobDescription(
  description,      // Job description text
  selectedModel,    // e.g., 'gpt-4'
  selectedProvider  // e.g., 'openai'
);

// Returns: JobDetails object with structured data
// - job: { job_title, seniority_level, employment_type, ... }
// - company: { company_name, industry, description, ... }
// - location: { city, country, onsite_required, ... }
// - responsibilities, requirements, nice_to_have, tech_stack, benefits, contact
```

**Provider Support**:
- OpenAI: Uses structured outputs for best results
- Gemini, Grok, Ollama: Uses regex fallback

---

#### `generateResume()`
Generate a tailored resume from base profile and job details.

```typescript
import { generateResume } from '@/lib/clientLLM';
import { getProfile } from '@/actions/profile';

const baseProfile = await getProfile();

const tailoredResume = await generateResume(
  baseProfile,      // Base profile from database
  jobDescription,   // Raw job description
  jobRole,          // Extracted job title
  company,          // Company name
  selectedModel,    // LLM model to use
  selectedProvider  // Provider name
);

// Returns: ResumeJSON object
// - header: { name, email, phone, linkedin, github, website }
// - summary: string
// - experience: Experience[]
// - projects: Project[]
// - skills: string[]
// - education: Education[]
// - certifications: Certification[]
```

**How it works**:
- Provider generates tailored content based on job requirements
- Highlights relevant experience and skills
- Adjusts summary to match job description
- Returns structured JSON matching ResumeJSON type

---

#### `generateCoverLetter()`
Generate a personalized cover letter.

```typescript
import { generateCoverLetter } from '@/lib/clientLLM';

const coverLetterText = await generateCoverLetter(
  baseProfile,      // Base profile
  tailoredResume,   // Generated resume
  jobDescription,   // Job description
  jobRole,          // Job title
  company,          // Company name
  selectedModel,    // LLM model
  selectedProvider  // Provider name
);

// Returns: string (formatted cover letter)
```

---

#### `fetchModels()`
Fetch available models from all configured providers.

```typescript
import { fetchModels } from '@/lib/clientLLM';

const modelsMap = await fetchModels();

// Returns: Record<string, string[]>
// {
//   "openai": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
//   "gemini": ["gemini-pro", "gemini-pro-vision"],
//   "grok": ["grok-4-1-fast-reasoning", "grok-vision-beta"],
//   "ollama": ["llama3", "codellama", "mistral"]
// }
```

**Note**: Currently returns static model lists. In future, will query providers dynamically.

---

## Provider Factory

Internal class that manages LLM provider instances with caching.

```typescript
// Automatically instantiates correct provider based on name
// Retrieves API keys from Tauri storage
// Caches instances to avoid re-initialization
const provider = await ProviderFactory.getInstance('openai');
```

**Providers Supported**:
- `openai` - OpenAI API (requires API key)
- `gemini` - Google Gemini (requires API key)
- `grok` - Grok API (requires API key)
- `ollama` - Local Ollama (no API key required)

---

## Complete Workflow Example

**Creating a new job with AI-generated resume and cover letter:**

```typescript
'use client';

import { useState } from 'react';
import { 
  parseJobDescription, 
  generateResume, 
  generateCoverLetter 
} from '@/lib/clientLLM';
import { getProfile } from '@/actions/profile';
import { createJob } from '@/actions/job';

export default function NewJobPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (description: string) => {
    setLoading(true);
    try {
      const model = 'gpt-4';
      const provider = 'openai';
      
      // Step 1: Parse job description (CLIENT-SIDE LLM)
      const jobDetails = await parseJobDescription(
        description, 
        model, 
        provider
      );
      
      // Step 2: Get base profile (SERVER ACTION - Database)
      const baseProfile = await getProfile();
      
      // Step 3: Generate resume (CLIENT-SIDE LLM)
      const tailoredResume = await generateResume(
        baseProfile,
        description,
        jobDetails.job.job_title,
        jobDetails.company.company_name,
        model,
        provider
      );
      
      // Step 4: Generate cover letter (CLIENT-SIDE LLM)
      const coverLetterText = await generateCoverLetter(
        baseProfile,
        tailoredResume,
        description,
        jobDetails.job.job_title,
        jobDetails.company.company_name,
        model,
        provider
      );
      
      // Step 5: Save to database (SERVER ACTION - Database)
      await createJob({ 
        jobDetails, 
        tailoredResume, 
        coverLetterText 
      });
      
      // Done!
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return <div>...</div>;
}
```

---

## API Key Management

API keys are stored in Tauri's secure storage and accessed client-side:

```typescript
import { getApiKey, setApiKey } from '@/lib/keyStorage';

// Store key
await setApiKey('openai', 'sk-...');

// Retrieve key
const key = await getApiKey('openai');
```

**Security Notes**:
- Keys stored encrypted in Tauri storage
- Never transmitted to server
- Only accessible in Tauri/browser client context
- Provider factory automatically retrieves keys when instantiating

---

## Server Actions (Database Only)

Server actions **never** perform LLM operations. They only handle database CRUD:

```typescript
// ✅ CORRECT - Server action saves pre-generated data
export async function createJob(input: {
  jobDetails: JobDetails;
  tailoredResume: ResumeJSON;
  coverLetterText: string;
}) {
  const job = await prisma.job.create({
    data: {
      company: input.jobDetails.company.company_name,
      role: input.jobDetails.job.job_title,
      // ...
    }
  });
  
  await prisma.resume.create({
    data: {
      jobId: job.id,
      contentJson: JSON.stringify(input.tailoredResume),
      // ...
    }
  });
  
  // ... save cover letter
}
```

```typescript
// ❌ WRONG - Server action should NOT call LLM
export async function createJob(description: string, model: string) {
  // ❌ NO! Don't instantiate LLM providers in server actions
  const provider = new OpenAIProvider(apiKey);
  const jobDetails = await provider.parseJobDetails(description);
  // ...
}
```

---

## Error Handling

All LLM operations should be wrapped in try-catch:

```typescript
try {
  const jobDetails = await parseJobDescription(desc, model, provider);
} catch (error) {
  // Handle LLM errors (rate limits, invalid keys, etc.)
  console.error('LLM operation failed:', error);
  alert('Error parsing job description. Check your API key.');
}
```

**Common Errors**:
- Invalid API key
- Rate limit exceeded
- Network timeout
- Provider service down
- Invalid model name

---

## Testing

When testing LLM operations:

1. **Mock the provider factory** for unit tests
2. **Use Ollama** for local integration tests (no API key needed)
3. **Test with real providers** in development
4. **Always check error paths** (invalid keys, timeouts)

Example test:

```typescript
// Mock provider for testing
jest.mock('@/lib/clientLLM', () => ({
  parseJobDescription: jest.fn().mockResolvedValue({
    job: { job_title: 'Software Engineer' },
    company: { company_name: 'Test Corp' },
    // ... mock data
  })
}));
```

---

## Future Enhancements

1. **Dynamic Model Fetching**: Query providers for available models in real-time
2. **Streaming Responses**: Stream LLM output for better UX
3. **Caching**: Cache parsed job descriptions to avoid redundant calls
4. **Background Processing**: Use Web Workers for heavy LLM operations
5. **Retry Logic**: Automatic retry with exponential backoff for transient errors

---

## Related Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [API Key Storage](../src/lib/KEYSTORAGE_README.md)
- [LLM Provider Types](../src/types/llm.ts)
- [Job Types](../src/types/resume.ts)
