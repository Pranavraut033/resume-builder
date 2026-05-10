# Production-Grade Testing Suite Implementation Plan

Based on the current codebase analysis, implement a realistic and production-grade testing architecture focused on real execution paths, integration reliability, and maintainable coverage.

## Core Testing Principles

* Real behavior is more important than artificial passing tests.
* Never modify assertions or implementation solely to make tests pass.
* Test failures are acceptable if they expose genuine defects.
* Avoid shallow mocks unless isolation is technically necessary.
* Prefer integration-style validation using real execution paths.
* All tests should validate actual behavior, not mocked assumptions.

---

# Current State Analysis

## Existing Tests

* `tests/actions/job.test.ts`
* `tests/actions/profile.test.ts`
* `tests/lib/prisma.test.ts`
* `tests/lib/clientLLM.test.ts`
* `tests/lib/colorUtils.test.ts`
* `tests/lib/llm/providers/*.test.ts`
* `tests/integration/llm-e2e.test.ts`

## Current Problems

### Heavy Mocking

Most tests mock Prisma, LLM providers, or external services, which prevents validation of actual runtime behavior.

### Missing Coverage

No tests currently exist for:

* `tokenUsage.ts`
* `urlFetcher.ts`
* prompt systems
* token tracking
* validation edge cases
* retry/timeout handling
* streaming behavior
* database side effects

### Missing Integration Coverage

* No real database integration tests
* No end-to-end API workflow validation
* No realistic LLM execution validation
* No verification of function/tool calling flows

### Missing Reliability Checks

* malformed input handling
* invalid auth handling
* boundary conditions
* pagination edge cases
* concurrency behavior
* rate limiting behavior

---

# Implementation Plan

# Phase 1 — Testing Infrastructure

## Real Database Integration

Use a real SQLite in-memory database for integration tests.

Requirements:

* isolated database per test suite
* transaction rollback between tests
* deterministic cleanup
* schema recreated automatically
* no mocked Prisma for integration tests

## Shared Test Infrastructure

Create:

* `tests/utils/db.ts`
* `tests/utils/factories.ts`
* `tests/utils/helpers.ts`
* `tests/utils/setup.ts`

Add:

* reusable factories
* deterministic ID generation
* seeded integration scenarios
* reusable auth helpers
* reusable API helpers

## Test Configuration

Enhance:

* `tests/config/test.config.ts`

Support:

* environment-based toggles
* real-vs-mocked execution modes
* CI-safe configuration
* timeout configuration
* API-key-aware execution

---

# Phase 2 — Real Integration Tests

## Job Actions

Create:

* `tests/integration/actions/job.integration.test.ts`

Validate:

* CRUD behavior
* cascade deletes
* transactional consistency
* serialization/deserialization
* invalid payload handling
* authorization rules
* concurrency edge cases

## Profile Actions

Create:

* `tests/integration/actions/profile.integration.test.ts`

Validate:

* profile lifecycle
* JSON field handling
* default profile generation
* invalid updates
* race-condition handling

## Token Usage Tests

Create:

* `tests/integration/actions/tokenUsage.test.ts`

Validate:

* token usage persistence
* aggregation logic
* filtering
* pagination
* provider/model grouping
* date range handling
* malformed data handling

## URL Fetcher Tests

Create:

* `tests/integration/actions/urlFetcher.test.ts`

Validate:

* URL normalization
* HTML extraction
* timeout handling
* invalid domains
* redirects
* malformed HTML
* network failures
* content sanitization

---

# Phase 3 — Real LLM Integration Testing

## Real Provider Execution

Refactor provider tests to support:

* real API execution
* real model responses
* real tool/function calling
* real token tracking

Supported providers:

* OpenAI
* Gemini
* Anthropic
* Grok
* Perplexity

Requirements:

* API keys loaded from environment variables
* minimal token usage
* cheapest supported models only
* lightweight prompts only
* deterministic prompts where possible

## Execution Modes

### CI Mode

* mocked execution allowed
* fast deterministic tests only
* no paid API calls

### Local/Integration Mode

* real API execution required
* no fake responses
* validates actual provider behavior

## LLM Edge Case Validation

Test:

* invalid API keys
* timeout behavior
* malformed provider responses
* provider rate limiting
* retry handling
* structured output validation
* function/tool calling correctness
* streaming behavior if supported

## Token Tracking Validation

Ensure:

* token usage is recorded correctly
* request IDs are generated correctly
* provider metadata persists correctly
* failed requests are still tracked properly

---

# Phase 4 — Prompt & Internal Logic Validation

## Prompt System Tests

Create:

* `tests/lib/prompts/`

Validate:

* prompt template resolution
* prompt variable injection
* missing variable handling
* invalid template behavior
* context extraction correctness

## ATS Analyzer Tests

Create:

* `tests/lib/atsAnalyzer.test.ts`

Validate:

* scoring consistency
* keyword matching
* weighting logic
* malformed resume handling
* empty input behavior

## Token Tracker Tests

Create:

* `tests/lib/tokenTracker.test.ts`

Validate:

* token persistence
* request lifecycle tracking
* aggregation logic
* provider attribution
* failure tracking

---

# Phase 5 — Reliability, Coverage & CI

## Coverage Requirements

Target:

* minimum 80% meaningful coverage
* near-complete critical-path coverage

Focus on:

* execution quality
* edge-case coverage
* integration reliability

Avoid:

* shallow assertion-only tests
* artificial branch inflation
* meaningless snapshot coverage

## Coverage Reporting

Add:

* uncovered path reporting
* critical path reporting
* failed integration diagnostics
* flaky test detection

## CI Integration

Ensure:

* deterministic execution
* stable parallel execution
* configurable retries
* proper timeout handling
* clean teardown
* isolated state between runs

---

# Explicit Testing Rules

## Allowed

* Real database execution
* Real provider execution
* Real function/tool calls
* Real serialization/deserialization
* Real validation logic
* Real retry logic

## Not Allowed

* Mocked success-only behavior
* Fake provider responses pretending to be real integrations
* Altering assertions to force passing tests
* Removing failing assertions without root-cause justification
* Coverage inflation through meaningless tests

---

# Technical Decisions

## Database Strategy

* SQLite in-memory database
* transactional rollback isolation
* deterministic fixtures

## LLM Strategy

Maintain both:

* fast mocked unit tests
* optional real-provider integration tests

Real provider tests must:

* use environment variables
* minimize cost
* validate actual behavior

## Testing Priority

Priority order:

1. logic correctness
2. integration correctness
3. edge-case handling
4. reliability under failure
5. coverage percentage

Coverage numbers alone are not success criteria.

---

# Scope Clarification

Do NOT prioritize frontend/component snapshot testing.

Focus on:

* business logic
* API behavior
* database correctness
* provider integration
* system reliability
* real execution validation
