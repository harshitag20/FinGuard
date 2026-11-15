# FinGuard AI Gateway: Pre-Integration Checklist & Handoff Manual

**Document Version:** 1.0.0-verified  
**Target Repositories:** `FinGuard Core` (Express + TS) & `FinGuard-FarmAgent` (FastAPI + Python)  
**Gateway Interface:** Prune AI Gateway (`https://api.withprune.com/v1`)  

---

## 1. Readiness Audit Status

```
[ READY FOR GOVERNED DEPLOYMENT ]
- General text assistance & static educational explanations
- Prune credential reading via environment (PRUNE_API_KEY)
- Prune Shield error handling (spend caps, rate limits, 503 fail-closed)
- Normalized receipt extraction (FinGuardReceipt) & Ed25519 signature verification
- Active model configuration: gemini-2.5-flash (with automatic gemini-3.5-flash-lite remapping)

[ NOT READY / PRESERVED ON DIRECT PROVIDER PATH ]
- Clinical disease diagnosis & water-quality telemetry (must remain direct until validation)
- Agent tool calling via Gemini (unverified translation; must remain direct)
- Multimodal image inputs (fish pathology cameras; must remain direct)
- Real-time voice & WebSocket audio streaming (Gemini Live; strictly direct)
```

---

## 2. Gemini Calls Routing Specification

| FinGuard Functional Area | Calling Function / Endpoint | Initial Route Target | Rationale & Safety Boundary |
| :--- | :--- | :--- | :--- |
| **General Farm Explanations** | `FinGuard Core / services/aiChatService.ts` | **Prune Gateway** | Safe general aquaculture knowledge; cost & rate governed. |
| **Species Reference Facts** | `FinGuard Core / services/speciesService.ts` | **Prune Gateway** | Safe for exact caching (`X-Prune-Cache: exact`). |
| **Clinical Fish Disease Diagnosis** | `FinGuard Core / services/diseaseScreening.ts` | **Direct Gemini** | High biosecurity risk. Must remain direct until clinical output tests pass. |
| **Water Quality & Alerting** | `FinGuard Core / services/telemetryAlerts.ts` | **Direct Gemini** | Volatile real-time pond sensors. Zero caching; direct path. |
| **Maritime Agent Farm Memory** | `FarmAgent / agents/farm_historian.py` | **Direct Gemini** | Tool calling (`get_farm_observations`) unverified on proxy. |
| **Camera Pathology Photos** | `FinGuard Core / services/imageAnalysis.ts` | **Direct Gemini** | Multimodal image forwarding unverified on proxy. |
| **Voice Live Expert** | `VoiceExpert / sockets/gemini_live.py` | **Direct Gemini Live** | WebSocket bidirectional audio incompatible with HTTP gateway. |

---

## 3. Future Modification Plan (Files & Functions to Update)

> [!IMPORTANT]
> **Strict Directive**: No modifications have been made to FinGuard Core or FinGuard-FarmAgent during this phase. The following list identifies the exact touchpoints for the upcoming adoption phase.

### 3.1 FinGuard Core (Express + TypeScript)
- **Module to Import**: `FinGuardPruneClient` from `FinGuard-PruneIntegration/typescript`.
- **Target File**: `src/services/aiChatService.ts`
  - Function: `handleGeneralChatMessage(userId, farmId, prompt)`
  - Modification: Replace direct Google Gen AI client with `client.createChatCompletion({ category: RequestCategory.GENERAL_TEXT, ... })`.
- **Target File**: `src/config/environment.ts`
  - Addition: Validate `PRUNE_API_KEY`, `PRUNE_ENABLED`, `PRUNE_MODE`, `GEMINI_MODEL`.
- **Target File**: `src/middleware/authMiddleware.ts`
  - Attachment: Ensure `farmId` and validated `userId` are passed as trusted metadata.

### 3.2 FinGuard-FarmAgent (FastAPI + Python)
- **Module to Import**: `FinGuardPruneClient` from `FinGuard-PruneIntegration/python`.
- **Target File**: `src/services/agent_runner.py`
  - Function: `run_research_query(query, farm_id)`
  - Modification: Use `client.create_chat_completion(category=RequestCategory.GENERAL_TEXT, run_id=run_id, run_budget_usd=0.05)`.
- **Target File**: `src/core/config.py`
  - Addition: Load `PRUNE_API_KEY` and fallback parameters.

---

## 4. Required Dashboard & Environment Configuration

### Prune Dashboard (`https://app.withprune.com`)
1. **Vault Gemini Provider Key**:
   - Navigate to **Connect** → **Providers** → **Google Gemini**.
   - Input provider key (`AQ...` or `AIza...`).
   - Ensures keys are vaulted under AES-256-GCM.
2. **Configure Daily Spend Ceiling**:
   - Go to **Shield** → **Spend Caps**.
   - Set maximum daily limit (e.g., `$50.00`).
3. **Configure Rate Limits**:
   - Set RPM (e.g., 60 requests/min).
4. **Configure Model Allowlist**:
   - Allow `gemini-2.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.8-flash`.

### Application Environment Variables (`.env`)
```env
PRUNE_API_KEY=prune_your_live_api_key_here
PRUNE_BASE_URL=https://api.withprune.com/v1
PRUNE_ENABLED=true
PRUNE_MODE=shadow
PRUNE_DEFAULT_FEATURE_ID=general_chat
PRUNE_DEFAULT_WORKLOAD=finGuard_core
PRUNE_TIMEOUT_SECONDS=30
PRUNE_MAX_RETRIES=1
PRUNE_CACHE_POLICY=disabled
PRUNE_ALLOW_DIRECT_FALLBACK=false
GEMINI_MODEL=gemini-2.5-flash
ENABLE_LIVE_PRUNE_TESTS=false
```

> [!CAUTION]
> **Mandatory Credential Rotation**:
> Any live credential used during this pre-integration verification audit must be rotated in the Prune Dashboard (**Connect → API Keys**) and Google AI Studio before production staging. Never commit `.env` or paste live keys into source files.

---

## 5. Rollback Procedure

In the event of an upstream Prune Gateway outage or unexpected model behavior:

1. **Instant Application Rollback**:
   Set `PRUNE_ENABLED=false` in the application environment and restart services. All traffic immediately routes to direct Gemini.
2. **Emergency Fallback Engagement**:
   If `PRUNE_ALLOW_DIRECT_FALLBACK=true` is enabled, adapter automatically routes around Prune when gateway returns 5xx or times out.
3. **Prune Dashboard Kill-Switch**:
   Disable the active API key in the Prune Dashboard to instantly block all proxied traffic at the perimeter.

