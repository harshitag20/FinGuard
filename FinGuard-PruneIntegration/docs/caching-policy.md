# FinGuard Caching Policy & Safety Specification

## 1. Safety Rationale

In aquaculture intelligence, stale or misapplied cached outputs can result in catastrophic mortality events. A diagnostic recommendation generated for a high-salinity tilapia pond in rainy conditions cannot be safely replayed for an aerated shrimp pond experiencing high ammonia toxicity, even if the user questions appear linguistically similar.

**Global Directive**: Caching is **disabled by default** (`PRUNE_CACHE_POLICY=disabled`), and semantic caching is strictly prohibited across all diagnostic, farm-specific, and clinical workflows.

---

## 2. Request Classification & Cache Eligibility Matrix

| Request Category | Example | Semantic Cache | Exact Match Cache | Gateway Header Sent | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Disease Diagnosis & Expert Analysis** | "Fish exhibit white spots on gills with erratic swimming. What treatment?" | **PROHIBITED** | **PROHIBITED** | `X-Prune-Cache: off` | High biosecurity risk; subtle symptom differences require fresh reasoning. |
| **Water Quality & Telemetry** | "Current DO is 2.8 mg/L and pH is 8.4 at Pond 3. Urgent action?" | **PROHIBITED** | **PROHIBITED** | `X-Prune-Cache: off` | Telemetry is volatile and time-critical. Stale advice could kill livestock. |
| **Farm-Specific Conversation** | "Review historical treatments applied to Pond 4 last November." | **PROHIBITED** | **PROHIBITED** | `X-Prune-Cache: off` | Specific to farm operational state; cannot be shared across tenants or sessions. |
| **Agent Tool Execution** | Gemini calls `fetch_pond_diagnostic_report(pond_id)` | **PROHIBITED** | **PROHIBITED** | `X-Prune-Cache: off` | Tool invocations interact with live database state. |
| **Static Educational Knowledge** | "What is the optimal temperature range for Oreochromis niloticus?" | Prohibited | **ALLOWED** (Opt-In Only) | `X-Prune-Cache: exact` | Biological species facts are static, deterministic, and non-sensitive. |
| **Glossary & General Biology** | "Explain the difference between aerated and biofloc aquaculture." | Prohibited | **ALLOWED** (Opt-In Only) | `X-Prune-Cache: exact` | Pure educational reference query with zero farm context. |

---

## 3. Why Semantic Caching is Disallowed for Diagnostic Queries

Prune supports semantic similarity caching (matching vector distance between prompt embeddings). While effective for generic SaaS customer support bots, semantic caching presents unacceptable risks in clinical aquaculture:

1. **False Equivalence**: Two prompts with 95% semantic similarity might differ by a critical clinical factor:
   - *Prompt A*: "Fish swimming near surface in morning at 22°C." (Likely nocturnal oxygen depletion)
   - *Prompt B*: "Fish swimming near surface at noon at 32°C." (Thermal stress / gas bubble disease)
2. **Cross-Tenant Pollution**: Prune scopes cache per account API key. Because FinGuard backend uses a shared Prune key across tenants, semantic caching could inadvertently return an answer customized for Farm X to Farm Y.
3. **Loss of Diagnostic Context**: Exact parameters matter. Caching based on approximate sentence vectors bypasses the reasoning model.

---

## 4. Policy Enforcement Mechanics

The FinGuard adapter enforces cache safety at two distinct layers:

### Layer 1: Client Request Router
Before dispatching a request to Prune, the FinGuard router checks:
```typescript
if (request.category !== RequestCategory.STATIC_EDUCATIONAL) {
  // Force cache off regardless of configuration
  headers['X-Prune-Cache'] = 'off';
}
```

### Layer 2: Response Verification
Every response is checked against its classification. If an unapproved diagnostic request returns `X-Prune-Cache-Hit: true` or `prune_metadata.cache_hit === true`, the adapter logs a critical policy violation warning for security review.

