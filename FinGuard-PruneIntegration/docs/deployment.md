# FinGuard AI Gateway: Deployment & Operations Manual

## 1. Deployment Topology

The `FinGuard-PruneIntegration` library is designed to be embedded directly into existing FinGuard services:

```
[FinGuard Core Service (Node.js Container)] ── embeds ──> typescript/src
[FinGuard FarmAgent (Python Container)]     ── embeds ──> python/src
```

Neither service requires an external proxy sidecar; all requests are dispatched securely over HTTPS (TLS 1.3) to `https://api.withprune.com/v1`.

---

## 2. Environment Variables & Secret Ingestion

In containerized runtimes (AWS ECS, Google Cloud Run, Kubernetes), inject the following environment variables:

| Variable | Sensitive | Recommended Source | Production Setting |
| :--- | :--- | :--- | :--- |
| `PRUNE_API_KEY` | **Yes** | AWS Secrets Manager / GCP Secret Manager | `prune_live_...` |
| `PRUNE_BASE_URL` | No | ConfigMap / Plain Env | `https://api.withprune.com/v1` |
| `PRUNE_ENABLED` | No | ConfigMap / Plain Env | `true` (Toggle for rollback) |
| `PRUNE_MODE` | No | ConfigMap / Plain Env | `shadow` (initially) → `active` |
| `PRUNE_CACHE_POLICY` | No | ConfigMap / Plain Env | `disabled` |
| `PRUNE_TIMEOUT_SECONDS` | No | ConfigMap / Plain Env | `30` |
| `PRUNE_MAX_RETRIES` | No | ConfigMap / Plain Env | `1` |
| `GEMINI_MODEL` | No | ConfigMap / Plain Env | `gemini-1.5-flash` |
| `PRUNE_ALLOW_DIRECT_FALLBACK` | No | ConfigMap / Plain Env | `false` |

> [!CAUTION]
> Never bake `PRUNE_API_KEY` into Docker image layers or commit it to `.env` files stored in source control.

---

## 3. Staged Phased Rollout (Shadow to Active)

To ensure high availability and prevent unexpected model disruptions:

### Phase 1: Shadow Mode (`PRUNE_MODE=shadow`)
- Traffic is proxied through Prune Gateway.
- All errors, shield blocks, and latencies are logged to FinGuard telemetry.
- Caching is strictly disabled.
- Verification checks ensure `prune_metadata` and response signatures parse correctly.

### Phase 2: Active Enforcement (`PRUNE_MODE=active`)
- Daily spend caps and per-key rate limits are enforced by Prune Shield.
- Agent runs attach run IDs and budget caps (`X-Prune-Run-Budget-Usd`).
- Exact caching is permitted solely for `RequestCategory.STATIC_EDUCATIONAL` queries.

### Phase 3: Rollback & Emergency Bypass
If Prune experiences an upstream outage and `PRUNE_ALLOW_DIRECT_FALLBACK=true` is enabled:
- The adapter logs a high-severity alert: `PRUNE_GATEWAY_BYPASS_ENGAGED`.
- Direct Gemini API key (if separately provisioned) is invoked.
- FinOps team is alerted immediately that Shield spend protections are temporarily bypassed.

---

## 4. Monitoring & Telemetry

### Key Metrics to Ingest
From every normalized `FinGuardReceipt`:
- `cache_hit` (boolean): Cache hit ratio per feature.
- `cost_usd` & `cost_saved_usd`: Real dollar spend and counterfactual savings.
- `input_tokens` & `output_tokens`: Token consumption velocity.
- `requested_model` vs `actual_model`: Frequency of cheaper-model routing.

### Alerts
- **HTTP 429 with `X-Prune-Shield-Code: spend_cap`**: Alert on-call FinOps engineer. AI traffic is blocked to prevent budget overruns.
- **HTTP 503 with `X-Prune-Shield-Code: shield_unavailable`**: Gateway policy service degradation. Check Prune status page.

