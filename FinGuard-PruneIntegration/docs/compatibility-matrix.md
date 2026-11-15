# FinGuard AI Gateway: Gemini & Capability Compatibility Matrix

## 1. Overview & Verification Standard

This matrix documents the verification status of Google Gemini features and FinGuard workload categories when routed through Prune AI Gateway (`https://api.withprune.com/v1`).

In accordance with FinGuard safety directives:
- **VERIFIED (Live)**: Validated against live Prune API endpoints and Google Gemini upstream responses.
- **VERIFIED (Doc/Mock)**: Confirmed in official Prune specifications and verified with deterministic local unit tests.
- **UNVERIFIED**: Capabilities where payload formatting or provider forwarding has not been proven end-to-end. Kept on direct provider path.
- **EXCLUDED**: Protocols incompatible with HTTP proxy architectures (e.g., real-time WebSocket audio).

---

## 2. Gemini Model Availability & Gateway Remapping Investigation

Live probes against `https://api.withprune.com/v1` revealed the following operational behavior:

| Model Requested | Upstream Gemini Status | Gateway Remap Behavior | Status in FinGuard |
| :--- | :--- | :--- | :--- |
| `gemini-1.5-flash` | **HTTP 404 (Not Found)** | Not found for Google API version v1beta | **Deprecated**; rejected upstream. |
| `gemini-2.0-flash` | **HTTP 404 (Not Available)** | Google deprecated model; advises updating | **Deprecated**; rejected upstream. |
| `gemini-2.5-flash` | **HTTP 200 (Success)** | **Remapped to `gemini-3.5-flash-lite`** | **Active Verified Target** |
| `gemini-3.5-flash-lite` | **HTTP 200 (Success)** | Direct execution model | **Active Execution Model** |

### Remapping Root Cause Analysis
During live testing, Prune attached the following metadata to the response:
```json
{
  "model_remapped": true,
  "deprecated_model": "gemini-2.5-flash",
  "mapped_model": "gemini-3.5-flash-lite",
  "remap_reason": "model_deprecated",
  "receipt_model": "gemini-3.5-flash-lite"
}
```
**Conclusion:** The mapping is a **gateway-level dynamic remapping** performed by Prune's optimization and routing engine. When a caller requests `gemini-2.5-flash`, Prune's catalog identifies that Google has deprecated that tier in favor of `gemini-3.5-flash-lite` and transparently routes the call to the active equivalent without breaking client contracts.

FinGuard Observability Rule: `requested_model` is recorded as `gemini-2.5-flash`, while `actual_model` is strictly recorded as `gemini-3.5-flash-lite`.

---

## 3. Gemini Feature Compatibility Matrix

| Capability | Status | Implementation Details / Constraints |
| :--- | :--- | :--- |
| **OpenAI-Compatible Client (`/v1/chat/completions`)** | **VERIFIED (Live)** | Primary integration path. Uses OpenAI SDK or standard HTTP client with `base_url="https://api.withprune.com/v1"`. |
| **Non-Streaming Text Chat** | **VERIFIED (Live)** | Returns full HTTP 200 payload, candidates content, usage tokens, and `prune_metadata`. |
| **Streaming (`stream=true`)** | **VERIFIED (Docs)** | Supported by Prune proxy for Gemini. |
| **Exact Match Caching (`X-Prune-Cache: exact`)** | **VERIFIED (Live)** | Second identical request returned `cache_hit: true`, `tokens_saved: 17`, `cost_saved_usd: 1e-06`. |
| **Cache Suppression (`X-Prune-Cache: off`)** | **VERIFIED (Live)** | Forces fresh upstream execution (`cache_hit: false`) even on repeat prompts. |
| **Ed25519 Signed Receipts (`v2`)** | **VERIFIED (Live)** | Cryptographic signature returned in header and metadata; verified via `POST /v1/receipts/verify`. |
| **Structured JSON (`response_format`)** | **VERIFIED (Docs/Mock)** | Supported via OpenAI-compatible `response_format: {"type": "json_object"}`. |
| **Gemini Tool / Function Calling (`tools`)** | **UNVERIFIED** | Translation of OpenAI tool schemas to Gemini function declarations is unverified. **Preserved on direct Gemini path.** |
| **Multimodal Images (`image_url`)** | **UNVERIFIED** | Image payload forwarding through proxy to Gemini is unverified. **Preserved on direct Gemini path.** |
| **Gemini Live (Audio / WebSockets)** | **EXCLUDED** | Real-time bidirectional WebSockets cannot route through HTTP proxy. **Preserved on direct Gemini Live path.** |

---

## 4. FinGuard Request Category Routing Decision Table

```
                         FinGuard Request Classifier
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        ▼                                                           ▼
 [General Educational Text]                                    [Direct Gemini]
  - General aquaculture knowledge                              - Clinical Disease Diagnosis
  - Static species reference facts                             - Pond Water Telemetry (pH/DO/Ammonia)
        │                                                      - Farm Operational Context & Logs
   Prune AI Gateway                                            - Maritime Agent Tool Calls
 (https://api.withprune.com/v1)                                - Fish Pathology Images
                                                               - Gemini Live Audio Streaming
```

| Request Category | Target Route | Supported | Cache Policy | Governance Headers Attached |
| :--- | :--- | :--- | :--- | :--- |
| **General Text & Explanations** | **Prune Gateway** | **Yes** | `X-Prune-Cache: off` | `X-Prune-Feature-Id: general_chat`<br/>`X-Prune-Workload: finGuard_core` |
| **Static Educational Reference** | **Prune Gateway** | **Yes** | `X-Prune-Cache: exact` | `X-Prune-Feature-Id: educational_knowledge`<br/>`X-Prune-Workload: finGuard_core` |
| **Clinical Disease Diagnosis** | **Direct Gemini** | No (Direct) | `X-Prune-Cache: off` | Bypasses Prune to guarantee clinical accuracy. |
| **Farm Operational Conversations** | **Direct Gemini** | No (Direct) | `X-Prune-Cache: off` | Bypasses Prune to safeguard private farm records. |
| **Agent Tool Calling (Maritime)** | **Direct Gemini** | No (Direct) | `X-Prune-Cache: off` | Bypasses Prune until tool-schema compatibility is proven. |
| **Multimodal Fish Photos** | **Direct Gemini** | No (Direct) | N/A (Direct) | Bypasses Prune until image forwarding is tested. |
| **Gemini Live Audio Sessions** | **Direct Gemini** | No (Direct) | N/A (Direct) | Direct WebSocket connection to Gemini Live. |
