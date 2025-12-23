/**
 * Test Configuration
 * 
 * Centralized configuration for all test suites.
 * Uses smallest/cheapest models to minimize testing costs.
 * API keys loaded from environment variables.
 * 
 * USAGE:
 * 
 * 1. Unit/Integration Tests with Mocks (Default):
 *    npm test
 *    Tests use mocked LLM providers - no API calls
 * 
 * 2. End-to-End Tests with Real LLMs:
 *    USE_REAL_LLM_APIS=true npm test
 *    Tests use real LLM API calls - requires API keys
 * 
 * 3. With Specific API Keys:
 *    USE_REAL_LLM_APIS=true TEST_OPENAI_API_KEY=sk-... npm test
 *    Set one or more provider API keys as needed
 * 
 * Helper functions to use in tests:
 * - shouldUseRealLLMs(): Returns true if real APIs should be tested
 * - getTestApiKey(provider): Gets API key for a provider
 * - getTestModel(provider): Gets recommended model for a provider
 * 
 * Example in test file:
 *   import { shouldUseRealLLMs, getTestApiKey, getTestModel } from '@/tests/config/test.config';
 *   
 *   const useRealAPIs = shouldUseRealLLMs();
 *   const apiKey = getTestApiKey('openai');
 *   const model = getTestModel('openai');
 *   
 *   if (!useRealAPIs) {
 *     // Setup mocks
 *   } else {
 *     // Use real provider
 *   }
 */

export const TEST_CONFIG = {
  /**
   * API Keys from environment variables
   * Set these in your .env.test file or CI/CD environment
   */
  apiKeys: {
    openai: process.env.TEST_OPENAI_API_KEY || 'test-openai-key',
    gemini: process.env.TEST_GEMINI_API_KEY || 'test-gemini-key',
    grok: process.env.TEST_GROK_API_KEY || 'test-grok-key',
    perplexity: process.env.TEST_PERPLEXITY_API_KEY || 'test-perplexity-key',
    // Ollama runs locally, no API key needed
    ollama: null,
  },

  /**
   * Smallest/cheapest models for cost-effective testing
   */
  models: {
    // OpenAI: gpt-4o-mini is the smallest, fastest, cheapest model
    openai: 'gpt-4o-mini',

    // Gemini: gemini-1.5-flash is the fastest, most cost-effective
    gemini: 'gemini-1.5-flash',

    // Grok: grok-4-1-fast-reasoning is xAI's Grok model
    grok: 'grok-4-1-fast-reasoning',

    // Perplexity: sonar is the most cost-effective
    perplexity: 'sonar',

    // Ollama: llama3 8B is lightweight for local testing
    ollama: 'llama3',
  },

  /**
   * Test timeouts (in ms)
   */
  timeouts: {
    llmRequest: 30000, // 30 seconds for LLM API calls
    database: 5000,    // 5 seconds for database operations
    unit: 1000,        // 1 second for unit tests
  },

  /**
   * Mock data settings
   */
  mocks: {
    useMockProviders: process.env.USE_MOCK_LLM === 'true',
    useRealAPIs: process.env.USE_REAL_LLM_APIS === 'true',
  },

  /**
   * Test environment settings
   */
  env: {
    isCI: process.env.CI === 'true',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
  },
} as const;

/**
 * Helper to check if real LLM APIs should be used in tests
 */
export function shouldUseRealLLMs(): boolean {
  return TEST_CONFIG.mocks.useRealAPIs && !TEST_CONFIG.mocks.useMockProviders;
}

/**
 * Helper to get API key for a provider
 */
export function getTestApiKey(provider: 'openai' | 'gemini' | 'grok' | 'perplexity' | 'ollama'): string | null {
  return TEST_CONFIG.apiKeys[provider];
}

/**
 * Helper to get model for a provider
 */
export function getTestModel(provider: 'openai' | 'gemini' | 'grok' | 'perplexity' | 'ollama'): string {
  return TEST_CONFIG.models[provider];
}
