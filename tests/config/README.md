# Test Configuration

This directory contains centralized configuration for all test suites.

## Files

### `test.config.ts`

Central configuration file for:

- **API Keys**: Loaded from environment variables (see `.env.test.example`)
- **Models**: Smallest/cheapest models for each provider to minimize testing costs
- **Timeouts**: Configurable timeouts for different test types
- **Environment Flags**: Control test behavior (mocking vs real APIs)

## Cost-Effective Testing

The test configuration uses the smallest, fastest, and cheapest models available:

| Provider | Model                     | Notes                                 |
| -------- | ------------------------- | ------------------------------------- |
| OpenAI   | `gpt-4o-mini`             | Smallest, fastest, cheapest GPT model |
| Gemini   | `gemini-1.5-flash`        | Fast and cost-effective               |
| Grok     | `grok-4-1-fast-reasoning` | xAI's Grok model                      |
| Ollama   | `llama3`                  | Runs locally, no API costs            |

## Environment Variables

Copy `.env.test.example` to `.env.test` and add your API keys:

```bash
cp .env.test.example .env.test
```

Then edit `.env.test` with your actual API keys:

```env
TEST_OPENAI_API_KEY=sk-...
TEST_GEMINI_API_KEY=AI...
TEST_GROK_API_KEY=gsk_...
```

## Usage

Import the test config in your test files:

```typescript
import {
  TEST_CONFIG,
  getTestApiKey,
  getTestModel,
} from "../config/test.config";

// Get API key for a provider
const apiKey = getTestApiKey("openai");

// Get model for a provider
const model = getTestModel("gemini");

// Use the full config
const timeout = TEST_CONFIG.timeouts.llmRequest;
```

## Running Tests with Real APIs

By default, tests use mocked providers. To run integration tests with real LLM APIs:

```bash
# Set environment variable
USE_REAL_LLM_APIS=true npm test

# Or in your .env.test file
USE_REAL_LLM_APIS=true
USE_MOCK_LLM=false
```

⚠️ **Warning**: Running tests with real APIs will incur costs. Even with the smallest models, hundreds of test runs can add up.

## CI/CD Integration

For CI/CD pipelines, set the environment variables as secrets:

```yaml
# GitHub Actions example
env:
  TEST_OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_API_KEY }}
  TEST_GEMINI_API_KEY: ${{ secrets.TEST_GEMINI_API_KEY }}
  TEST_GROK_API_KEY: ${{ secrets.TEST_GROK_API_KEY }}
  USE_MOCK_LLM: true # Keep mocking enabled in CI
```

## Helper Functions

### `shouldUseRealLLMs()`

Returns `true` if tests should use real LLM APIs instead of mocks.

### `getTestApiKey(provider)`

Returns the API key for the specified provider from environment variables.

### `getTestModel(provider)`

Returns the test model name for the specified provider.
