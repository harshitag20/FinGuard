# FinGuard AI Gateway: Prune Integration Guide & Technical Contracts

## 1. Prerequisites & Prune Setup

### Step 1: Create a Prune Account
1. Navigate to [https://app.withprune.com](https://app.withprune.com) and create an account.
2. Sign in to access your tenant dashboard.

### Step 2: Vault Your Google Gemini Provider Key
1. In the Prune dashboard, go to **Connect** → **Providers**.
2. Select **Google Gemini**.
3. Paste your Gemini API key (e.g., `AIzaSy...` or `AQ...`).
4. Prune stores this key encrypted at rest with **AES-256-GCM** using dedicated key separation. Application code never accesses raw Gemini credentials.

### Step 3: Generate a Prune Gateway API Key
1. Navigate to **Connect** → **API Keys**.
2. Click **Create Key** (starts with `prune_`).
3. Store this key in your secure secret manager or `.env` file as `PRUNE_API_KEY`.

---

## 2. Environment Configuration

Copy the template from `.env.example` to your local environment:
```bash
cp .env.example .env
```

Configured environment variables:
```env
PRUNE_API_KEY=prune_your_key_here
PRUNE_BASE_URL=https://api.withprune.com/v1
PRUNE_ENABLED=true
PRUNE_MODE=active
PRUNE_DEFAULT_FEATURE_ID=general_chat
PRUNE_DEFAULT_WORKLOAD=finGuard_core
PRUNE_TIMEOUT_SECONDS=30
PRUNE_MAX_RETRIES=1
PRUNE_CACHE_POLICY=disabled
PRUNE_ALLOW_DIRECT_FALLBACK=false
GEMINI_MODEL=gemini-2.5-flash
ENABLE_LIVE_PRUNE_TESTS=false
```

---

## 3. Integration Contracts

Both TypeScript and Python adapters implement equivalent contracts, error hierarchies, and observability schemas.

### 3.1 Request Contract
```typescript
interface ChatCompletionRequest {
  category: RequestCategory;           // Enum: GENERAL_TEXT, STATIC_EDUCATIONAL, etc.
  messages: Array<{ role: string; content: string }>;
  model?: string;                      // Defaults to GEMINI_MODEL (gemini-2.5-flash)
  farmId?: string;                     // Injected as X-Prune-Customer-Id
  featureId?: string;                  // Injected as X-Prune-Feature-Id
  workload?: string;                   // Injected as X-Prune-Workload
  runId?: string;                      // Injected as X-Prune-Run-Id
  runBudgetUsd?: number;               // Injected as X-Prune-Run-Budget-Usd
  maxSteps?: number;                   // Injected as X-Prune-Max-Steps
  temperature?: number;                // Sampling temperature (default: 0.2)
  maxTokens?: number;                  // Maximum completion tokens (default: 1024)
  verifyReceipt?: boolean;             // Optional online receipt validation (default: false)
}
```

### 3.2 Normalized Response & Observability Contract
Every response from `createChatCompletion()` guarantees the following observability fields:

```typescript
interface FinGuardReceipt {
  request_id: string;                  // Prune or gateway request ID
  farm_id: string | null;              // Tenant attribution
  feature_id: string;                  // Product feature tag
  workload: string;                    // Workload cluster
  requested_model: string;             // Model requested by caller (e.g. gemini-2.5-flash)
  actual_model: string | null;         // Actual served model (e.g. gemini-3.5-flash-lite)
  provider: string | null;             // Upstream provider ('gemini')
  cache_hit: boolean;                  // True if served from cache
  cache_type: string | null;           // 'exact' or 'semantic'
  input_tokens: number | null;         // Prompt token count
  output_tokens: number | null;        // Candidate completion token count
  total_tokens: number | null;         // Total billable tokens
  cost_usd: number | null;             // Realized cost in USD
  cost_saved_usd: number | null;       // Counterfactual cost saved
  tokens_saved: number | null;         // Tokens saved via optimization/caching
  optimizations_applied: string[];     // E.g. ['cheaper_model_routing', 'remap:model_deprecated']
  receipt_signature: string | null;    // Ed25519 signature string
  receipt_key_id: string | null;       // Signing key ID (e.g. 'd4c5e8e9')
  receipt_verification_status: string; // 'verified' | 'failed' | 'unverified' | 'skipped'
  latency_ms: number | null;           // Total end-to-end client latency
  upstream_latency_ms: number | null;  // Time spent in upstream model provider
  retry_count: number;                 // Number of retry attempts made
  created_at: string;                  // ISO 8601 timestamp
}
```

> [!IMPORTANT]
> **Gateway Execution vs. Receipt Verification:**
> - **Successful Gateway Execution**: Prune successfully proxies the request to Gemini and returns HTTP 200 with the completion content and a signed `prune_metadata` object.
> - **Successful Receipt Verification**: Independent cryptographic validation (via `POST /v1/receipts/verify` or offline Ed25519) that confirms the signature matches the canonical JSON fields and originates from Prune's published public key (`d4c5e8e9`). A gateway call can succeed even if verification is skipped or deferred to an offline audit pipeline.

---

## 4. Timeout and Retry Behavior

- **Timeout**: Enforced via `AbortController` (TypeScript) and HTTP client timeouts (Python). Defaults to 30 seconds (`PRUNE_TIMEOUT_SECONDS`).
- **Bounded Retries with Exponential Backoff & Jitter**:
  - Transient errors (`PruneRateLimitError`, `PruneShieldUnavailableError`, network drops) are retried up to `PRUNE_MAX_RETRIES` (default: 1, max ceiling: 5).
  - Backoff delay formula: `min(1000ms, 200ms * (2 ^ (attempt - 1)) + random_jitter_ms)`.
- **Strict Non-Retryable Errors**:
  - Authentication failure (`401` `PruneAuthenticationError`): Never retried.
  - Spending cap exhaustion (`429` `PruneSpendCapError`): Never retried. Direct fallback strictly prohibited.
  - Model unavailable / invalid request (`400/404` `PruneError`): Never retried.

---

## 5. Troubleshooting & Shield Error Codes

| Shield Code | HTTP Status | Cause | Application Handling |
| :--- | :--- | :--- | :--- |
| `spend_cap` | 429 / 403 | Daily or run spending ceiling reached. | **Do NOT retry.** Alert FinOps. Direct fallback blocked. |
| `rate_limit` | 429 | Requests per minute exceeded. | Exponential backoff with jitter up to `maxRetries`. |
| `shield_unavailable`| 503 | Gateway policy service timeout. | Transient failure; retry up to `maxRetries`. |
| `invalid_key` | 401 | `PRUNE_API_KEY` is missing or invalid. | Do not retry. Verify `.env` configuration. |
| `model_unavailable`| 404 | Model not found or deprecated. | Do not retry. Verify model in `GEMINI_MODEL`. |
