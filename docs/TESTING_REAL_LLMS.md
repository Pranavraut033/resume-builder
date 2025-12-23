# Testing Real LLM APIs

This project includes comprehensive test suites for LLM providers with two testing modes:

## 1. Default: Unit/Integration Tests with Mocks

By default, all tests use **mocked LLM providers**. This means:

- No API calls are made
- Tests are fast and free to run
- No API keys required
- Perfect for CI/CD pipelines

```bash
npm test
```

## 2. Real LLM API Testing

To test against **real LLM APIs**, enable real API testing:

```bash
USE_REAL_LLM_APIS=true npm test
```

This will:

- Run all unit tests with mocks (as before)
- Additionally run integration/E2E tests against real APIs
- Tests in `tests/integration/llm-e2e.test.ts` will execute
- Tests that require API keys will be skipped if keys aren't configured

## Configuring API Keys for Real Testing

Provide API keys via environment variables:

```bash
USE_REAL_LLM_APIS=true \
TEST_OPENAI_API_KEY=sk-... \
TEST_GEMINI_API_KEY=... \
TEST_GROK_API_KEY=... \
npm test
```

### Individual Providers

Test only specific providers:

```bash
# Test only OpenAI
USE_REAL_LLM_APIS=true TEST_OPENAI_API_KEY=sk-... npm test -- openai

# Test only Gemini
USE_REAL_LLM_APIS=true TEST_GEMINI_API_KEY=... npm test -- gemini
```

### Ollama (Local)

To test with Ollama (no API key needed):

```bash
# First, ensure Ollama is running locally
ollama serve

# Then run tests
USE_REAL_LLM_APIS=true npm test -- ollama
```

## Test Structure

### Unit Tests (Mocked)

- `tests/lib/llm/providers/*.test.ts` - Provider unit tests
- `tests/lib/clientLLM.test.ts` - Client LLM integration tests
- `tests/actions/**/*.test.ts` - Server action tests

All use mocked providers by default.

### Integration Tests (Real APIs)

- `tests/integration/llm-e2e.test.ts` - End-to-end tests with real LLMs

Only runs when `USE_REAL_LLM_APIS=true`.

## Helper Functions

Use these in your tests:

```typescript
import {
  shouldUseRealLLMs,
  getTestApiKey,
  getTestModel,
  TEST_CONFIG,
} from "@/tests/config/test.config";

// Check if real APIs should be tested
if (shouldUseRealLLMs()) {
  // Run real API test
} else {
  // Setup mocks
}

// Get API key for a provider
const apiKey = getTestApiKey("openai"); // null if not set
const apiKey = getTestApiKey("ollama"); // always null (no key needed)

// Get recommended model for testing
const model = getTestModel("openai"); // 'gpt-4o-mini'
const model = getTestModel("gemini"); // 'gemini-1.5-flash'
const model = getTestModel("grok"); // 'grok-4-1-fast-reasoning'
const model = getTestModel("ollama"); // 'llama3'
```

## Environment Variables Reference

| Variable              | Purpose                                | Example   |
| --------------------- | -------------------------------------- | --------- |
| `USE_REAL_LLM_APIS`   | Enable real API testing                | `true`    |
| `TEST_OPENAI_API_KEY` | OpenAI API key                         | `sk-...`  |
| `TEST_GEMINI_API_KEY` | Google Gemini API key                  | `AIza...` |
| `TEST_GROK_API_KEY`   | xAI Grok API key                       | `xai-...` |
| `NODE_ENV`            | Environment (auto-detected)            | `test`    |
| `CI`                  | CI/CD environment flag (auto-detected) | `true`    |

## Cost Optimization

The test suite uses the **cheapest/fastest models** to minimize API costs:

| Provider | Model                     | Cost             |
| -------- | ------------------------- | ---------------- |
| OpenAI   | `gpt-4o-mini`             | ~$0.15/1M tokens |
| Gemini   | `gemini-1.5-flash`        | Free/very cheap  |
| Grok     | `grok-4-1-fast-reasoning` | Model pricing    |
| Ollama   | `llama3`                  | Free (local)     |

## Conditional Test Patterns

### Skip mocks when testing real APIs

```typescript
import { shouldUseRealLLMs } from '../config/test.config';

if (!shouldUseRealLLMs()) {
  vi.mock('openai', () => ({...}));
}
```

### Run test only when real APIs enabled

```typescript
const describeIfRealLLM = shouldUseRealLLMs() ? describe : describe.skip;

describeIfRealLLM("Real API Tests", () => {
  it("should work with real API", async () => {
    // This test only runs when USE_REAL_LLM_APIS=true
  });
});
```

### Skip test if API key missing

```typescript
const apiKey = getTestApiKey("openai");
const skipIfNoKey =
  apiKey && apiKey !== "test-openai-key" ? describe : describe.skip;

skipIfNoKey("OpenAI Real Tests", () => {
  // Skipped if no valid API key configured
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      # Run unit tests (mocks only - always pass)
      - run: npm test

      # Run E2E tests with real APIs (only on main branch)
      - run: npm test -- llm-e2e.test.ts
        if: github.ref == 'refs/heads/main'
        env:
          USE_REAL_LLM_APIS: "true"
          TEST_OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          TEST_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## Troubleshooting

### "Provider not available" error

- Real API test is running but API key is not configured
- Check that `TEST_<PROVIDER>_API_KEY` is set
- Or disable real APIs: remove `USE_REAL_LLM_APIS=true`

### "ECONNREFUSED" for Ollama

- Ollama service is not running
- Start with: `ollama serve`
- Or disable real APIs

### Mock setup errors

- Mocks are not being registered when `USE_REAL_LLM_APIS=true`
- Check that vi.mock() is wrapped in `if (!shouldUseRealLLMs())`
- Mocks must be defined before importing the module under test

### High API costs

- Change the model in test.config.ts to a cheaper option
- Or disable real APIs for local development
- Real API tests are best run in CI/CD with controlled frequency
