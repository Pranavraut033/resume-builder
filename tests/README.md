# Testing Guide

This document describes the testing infrastructure for the Resume Builder application.

## Overview

The project uses [Vitest](https://vitest.dev/) as the testing framework, chosen for its fast performance and excellent TypeScript support.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once and exit
npm test:run

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage
```

## Test Structure

```
tests/
├── setup.ts              # Global test setup
├── config/               # Test configuration
│   ├── test.config.ts   # Centralized test config with API keys and models
│   └── README.md        # Configuration documentation
├── mocks/                # Mock implementations
│   ├── prisma.ts        # Prisma client mocks
│   └── llm.ts           # LLM provider mocks
├── fixtures/             # Test data
│   └── data.ts          # Sample profiles, jobs, resumes
├── actions/              # Server Actions tests
│   ├── job.test.ts      # Job CRUD operations
│   └── profile.test.ts  # Profile operations
└── lib/                  # Library tests
    ├── prisma.test.ts   # Prisma initialization
    ├── clientLLM.test.ts # Client LLM functions
    └── llm/providers/   # LLM provider tests
        ├── openai.test.ts
        ├── gemini.test.ts
        ├── grok.test.ts
        └── ollama.test.ts
```

## Configuration

All test configuration is centralized in `tests/config/test.config.ts`. This includes:

- **API Keys**: Loaded from environment variables (`.env.test`)
- **Models**: Smallest/cheapest models to minimize testing costs
  - OpenAI: `gpt-4o-mini`
  - Gemini: `gemini-1.5-flash`
  - Grok: `grok-4-1-fast-reasoning`
  - Ollama: `llama3`
- **Timeouts**: Configurable timeouts for LLM requests, database operations, etc.

See [tests/config/README.md](./config/README.md) for detailed configuration documentation.

### Setting Up API Keys

1. Copy the example environment file:

   ```bash
   cp .env.test.example .env.test
   ```

2. Add your API keys to `.env.test`:

   ```env
   TEST_OPENAI_API_KEY=sk-...
   TEST_GEMINI_API_KEY=AI...
   TEST_GROK_API_KEY=gsk_...
   ```

3. By default, tests use mocked providers. To test with real APIs:
   ```bash
   USE_REAL_LLM_APIS=true npm test
   ```

## Test Categories

### 1. Prisma Initialization Tests

Located in `tests/lib/prisma.test.ts`, these tests verify:

- PrismaClient instantiation
- Singleton pattern implementation
- Correct log levels for different environments
- Database schema model definitions

### 2. Database Operations Tests

Located in `tests/actions/`, these tests verify Server Actions:

**Job Actions** (`job.test.ts`):

- Creating jobs with parsed details, resumes, and cover letters
- Getting all jobs
- Getting job by ID
- Updating job status
- Deleting jobs
- CRUD operations for resumes and cover letters

**Profile Actions** (`profile.test.ts`):

- Getting profile (existing or default)
- Creating new profiles
- Updating existing profiles
- JSON serialization

### 3. LLM Provider Tests

Located in `tests/lib/llm/providers/`, these tests verify each provider:

- Resume generation
- Cover letter generation
- Model fetching
- Job description parsing (OpenAI only)
- Error handling
- Default model fallbacks

### 4. Client LLM Functions Tests

Located in `tests/lib/clientLLM.test.ts`, these tests verify:

- Job description parsing with structured outputs
- Fallback parsing for non-OpenAI providers
- Resume generation
- Cover letter generation
- Model fetching
- Provider factory caching

## Mocking Strategy

### Prisma Mocks

Using `vitest-mock-extended` for deep mocking:

```typescript
import { prismaMock } from "../mocks/prisma";

// Mock return values
prismaMock.job.findMany.mockResolvedValue([...jobs]);
```

### LLM Provider Mocks

Mocking external APIs to avoid real API calls:

```typescript
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function (this: any) {
    this.chat = { completions: { create: mockCreate } };
    return this;
  }),
}));
```

### Tauri Mocks

Mocking Tauri plugins (store, stronghold) for client-side testing:

```typescript
vi.mock("@tauri-apps/plugin-store", () => ({
  Store: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

describe("Feature Name", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe("functionName", () => {
    it("should do something", async () => {
      // Arrange
      prismaMock.model.method.mockResolvedValue(mockData);

      // Act
      const result = await functionToTest();

      // Assert
      expect(result).toEqual(expectedValue);
      expect(prismaMock.model.method).toHaveBeenCalledWith(expectedArgs);
    });
  });
});
```

### Testing Server Actions

```typescript
import { createJob } from "@/actions/job";

it("should create a job", async () => {
  const mockJob = { id: 1, company: "Test", role: "Engineer" /* ... */ };
  prismaMock.job.create.mockResolvedValue(mockJob);

  const result = await createJob({ jobDetails: sampleJobDetails });

  expect(result).toEqual({ jobId: 1 });
  expect(prismaMock.job.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      company: sampleJobDetails.company.company_name,
      role: sampleJobDetails.job.job_title,
    }),
  });
});
```

### Testing LLM Providers

```typescript
it("should generate resume", async () => {
  const mockResume = {
    /* ... */
  };
  mockClient.chat.completions.create.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(mockResume) } }],
  });

  const result = await provider.generateResume({
    baseProfile: sampleBaseProfile,
    jobDetails: sampleJobDetails,
    model: "gpt-4o",
  });

  expect(result).toEqual(mockResume);
});
```

## Test Fixtures

Located in `tests/fixtures/data.ts`:

- `sampleBaseProfile`: Complete user profile with experience, education, skills
- `sampleJobDetails`: Comprehensive job description with all parsed fields
- `sampleTailoredResume`: Tailored resume based on job requirements

Use these fixtures in tests to maintain consistency:

```typescript
import { sampleBaseProfile, sampleJobDetails } from "../fixtures/data";
```

## Coverage

Coverage reports are generated using V8 and output in multiple formats:

- Text summary in terminal
- JSON for CI integration
- HTML for detailed browsing

View HTML coverage report after running `npm test:coverage`:

```bash
open coverage/index.html
```

## CI Integration

Tests are designed to run in CI environments:

- Fast execution (< 2 seconds)
- No external dependencies
- Deterministic results
- Clear error messages

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Naming**: Use descriptive test names (`should...`)
3. **Mock Reset**: Always reset mocks in `beforeEach`
4. **Arrange-Act-Assert**: Follow AAA pattern
5. **Test Behavior**: Focus on what, not how
6. **Edge Cases**: Test error conditions and edge cases
7. **Async/Await**: Always await async operations
8. **Type Safety**: Use TypeScript for type-safe tests

## Troubleshooting

### Module Not Found

If you see "module not found" errors:

```bash
npm run db:generate  # Regenerate Prisma client
```

### Mock Not Working

Ensure mocks are defined before imports:

```typescript
vi.mock("@/lib/prisma"); // Must be before import
import { prisma } from "@/lib/prisma";
```

### Timeout Errors

Increase timeout for slow tests:

```typescript
it("slow test", async () => {
  // test code
}, 10000); // 10 second timeout
```

## Future Improvements

- [ ] Integration tests with real database
- [ ] E2E tests with Playwright
- [ ] Visual regression testing
- [ ] Performance benchmarks
- [ ] Snapshot testing for UI components

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [vitest-mock-extended](https://github.com/marchaos/vitest-mock-extended)
- [Testing Library](https://testing-library.com/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
