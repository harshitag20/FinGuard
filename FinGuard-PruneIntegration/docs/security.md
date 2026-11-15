# FinGuard Security & Privacy Architecture: Prune Integration

## 1. Core Security Principles

FinGuard handles commercial aquaculture operations, sensitive water-quality telemetry, and diagnostic incident records. Protecting farm operational data, farmer identities, and AI infrastructure credentials is an absolute requirement.

### Absolute Rules
1. **Zero Frontend Exposure**: `PRUNE_API_KEY` and upstream provider credentials must exist solely within trusted backend runtimes (FinGuard Core Express service, FarmAgent FastAPI service). They must **never** be injected into Vite/React builds, mobile bundles, or client-accessible endpoints.
2. **Credential Sanitization in Logs**: Authorization headers, Bearer tokens, and raw API keys must never appear in application logs, audit logs, or error traces.
3. **Backend-Validated Attribution**: Frontend clients cannot specify `X-Prune-Customer-Id`, `X-Prune-Run-Budget-Usd`, or feature IDs. All governance headers are deterministically attached by trusted backend middleware after verifying session authentication and tenant authorization.
4. **Untrusted Model Outputs**: All responses returned through Prune (from Gemini or cache) are treated as untrusted data and must undergo domain validation before presentation or ingestion into farm records.
5. **Fail-Closed Gateways**: If Prune Shield cannot verify a spend cap or rate limit, requests are rejected (HTTP 503 `shield_unavailable`). FinGuard will not bypass Shield to call the provider directly unless an explicit, separately-audited emergency toggle is active.

---

## 2. Credential Management & Prune Vault

| Credential Type | Storage Location | Encryption at Rest | Purpose |
| :--- | :--- | :--- | :--- |
| **Google Gemini API Key** | Prune Credential Vault | AES-256-GCM (with key separation) | Upstream model provider authentication |
| **Prune Gateway Key** (`prune_...`) | Backend Environment (`PRUNE_API_KEY`) | OS Environment / Secret Manager | Gateway authentication & Shield policy mapping |
| **HMAC-SHA256 Hash** | Prune Control Plane | Keyed HMAC-SHA256 | Immutable key verification on gateway |

> [!IMPORTANT]
> Because provider keys are securely vaulted inside Prune, FinGuard developers and application instances do not require local Gemini API keys during normal production operations.

---

## 3. Farm Privacy & Data Minimization

Aquaculture data can reveal sensitive commercial production numbers, biosecurity outbreak locations, and farmer contact details.

- **Identifier Tokenization**: Use stable internal identifiers (e.g., `farm_uuid_4892`) rather than farmer names, personal phone numbers, or cadastral coordinates.
- **Farm ID != Authorization**: The presence of a `farm_id` in a request is an identifier, not a credential. The backend must enforce role-based access control (RBAC) to verify the authenticated user has access to that specific farm before dispatching LLM queries.
- **Diagnostic Content Protection**: Model optimization layers (compression, prompt trimming) must never trim critical pond parameters (e.g., dissolved oxygen, salinity, pH, ammonia levels) or pathogen symptoms.

---

## 4. Prune Shield Policies: Dashboard vs Application Division

| Security Capability | Enforced In Prune Dashboard | Enforced In FinGuard Application |
| :--- | :--- | :--- |
| **Provider Key Vaulting** | AES-256-GCM encryption & key separation | Never reads or stores Gemini keys |
| **Daily Spend Caps** | Hard dollar cap per API key | Run-level budget tracking via `X-Prune-Run-Budget-Usd` |
| **Rate Limiting** | Per-minute RPM/TPM counter enforcement | Bounded concurrency & exponential backoff |
| **Model Allowlists** | Rejects unapproved model identifiers | Routes only to verified Gemini models |
| **Emergency Kill-Switch** | Disable key or gateway access in UI | `PRUNE_ENABLED=false` bypasses gateway safely |
| **Cache Suppression** | Respects `X-Prune-Cache: off` | Enforces zero-cache rule on diagnostic requests |
| **Shield Error Reporting** | Emits `X-Prune-Shield-Code` | Maps shield codes to domain exceptions |

---

## 5. Security Limitations & Non-Claims

> [!WARNING]
> - **Prune does not eliminate prompt injection**: Shield can detect known leak signatures and canary tokens, but application-level input sanitization remains necessary.
> - **Prune does not validate diagnostic correctness**: Prune is a protocol gateway. It cannot determine whether a fish pathology diagnosis or chemical dosage calculation is clinically sound.
> - **SOC 2 Status**: As documented, Prune does not currently hold a SOC 2 Type II report. Defense-in-depth requires that FinGuard enforce backend authorization and strict data minimization independently.

