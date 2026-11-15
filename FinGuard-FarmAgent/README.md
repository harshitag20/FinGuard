# FinGuard Farm Intelligence Agent

FinGuard Farm Intelligence Agent is a persistent, farm-specific AI agent architecture built for aquaculture intelligence. It couples Google Gemini 2.5 Flash for multimodal veterinary reasoning with Maritime.sh persistent micro-VM infrastructure for per-farm isolation, local storage, and background research execution.

---

## 1. Architecture Overview

FinGuard implements a strict farm-centric, two-tier architecture:
1. **Control Plane**: A centralized management application responsible for farm registration, agent lifecycle management, tenant authorization, and message routing.
2. **Agent Runtime**: An independent Python application deployed inside each farm's dedicated Maritime micro-VM. It mounts persistent storage at `/data`, loads the farm's profile, manages SQLite history, and uses Gemini 2.5 Flash with tool calling for intelligent queries and observation recording.

```mermaid
flowchart TD
    subgraph ClientLayer["FinGuard Applications & API Clients"]
        Web[FinGuard Web App]
        Mobile[Farmer Mobile App]
        Voice[FinGuard Voice Expert]
    end

    subgraph ControlPlane["FinGuard Control Plane (:8080)"]
        CP_API["FastAPI REST Routes"]
        Auth["Tenant Authorization"]
        FarmSvc["Farm Service"]
        AgentSvc["Agent Service"]
        CP_DB[("Control Plane SQLite<br/>data/control_plane.db")]
        M_Client["Maritime SDK Client"]
    end

    subgraph MaritimeCloud["Maritime.sh Persistent Infrastructure"]
        subgraph AgentVM1["Farm Agent Micro-VM (FARM-001)"]
            Runtime1["FastAPI Runtime (:PORT)"]
            Gemini1["Google Gemini 2.5 Flash<br/>(Tool Calling Engine)"]
            Tools1["Tool Registry<br/>(Diagnostics, WQ, Obs, Research)"]
            Data1[("Persistent SQLite<br/>/data/farm_FARM-001.db")]
        end

        subgraph AgentVM2["Farm Agent Micro-VM (FARM-002)"]
            Runtime2["FastAPI Runtime (:PORT)"]
            Gemini2["Google Gemini 2.5 Flash<br/>(Tool Calling Engine)"]
            Tools2["Tool Registry<br/>(Diagnostics, WQ, Obs, Research)"]
            Data2[("Persistent SQLite<br/>/data/farm_FARM-002.db")]
        end
    end

    ClientLayer -->|REST API / Token Auth| CP_API
    CP_API --> FarmSvc
    CP_API --> AgentSvc
    FarmSvc --> CP_DB
    AgentSvc --> CP_DB
    AgentSvc --> M_Client

    M_Client -->|POST /api/agents/{id}/chat| Runtime1
    M_Client -->|POST /api/agents/{id}/chat| Runtime2

    Runtime1 --> Gemini1
    Gemini1 <--> Tools1
    Tools1 <--> Data1

    Runtime2 --> Gemini2
    Gemini2 <--> Tools2
    Tools2 <--> Data2
```

---

## 2. Technology Stack

- **Python**: 3.12+
- **API Framework**: FastAPI & Uvicorn
- **LLM Reasoning**: Google Gemini API via `google-genai` SDK (`gemini-2.5-flash`)
- **Agent Hosting**: Maritime.sh persistent micro-VM containers (Firecracker)
- **Local Storage**: SQLite under `/data`
- **Validation**: Pydantic v2
- **Testing**: pytest & pytest-asyncio
- **HTTP Client**: httpx

---

## 3. Repository Structure

```
FinGuard-FarmAgent/
├── agent_runtime/             # Code deployed inside Maritime micro-VM
│   ├── config.py              # Runtime configuration (PORT, /data, keys)
│   ├── main.py                # FastAPI server (GET /health, POST /chat)
│   ├── start.py               # Maritime entrypoint binding 0.0.0.0:$PORT
│   ├── core/
│   │   ├── agent.py           # Gemini agent reasoning engine
│   │   ├── prompts.py         # System prompt with clinical disclaimers
│   │   └── tool_registry.py   # Tool declarations for Gemini
│   ├── memory/                # Context and conversational memory
│   ├── storage/
│   │   ├── database.py        # SQLite schema initialization
│   │   └── repositories.py    # Repositories for Diagnostics, Obs, WQ, Research
│   ├── security/
│   │   └── tenant_isolation.py# Strict farm-centric access check
│   └── tools/
│       └── farm_tools.py      # Implementations of all 10 agent tools
├── control_plane/             # Central management application
│   ├── config.py
│   ├── main.py
│   ├── maritime_client.py     # Official Maritime SDK adapter
│   ├── farm_service.py        # Farm registration and queries
│   ├── agent_service.py       # Provisioning and message routing
│   ├── models/                # Control plane SQLite models
│   └── routes/                # FastAPI routers (/health, /farms, /agents, /messages)
├── shared/contracts/          # Shared Pydantic data contracts
├── data/
│   └── seed/                  # Mock data for demonstration farms
├── tests/                     # Automated test suite (18 unit & isolation tests)
├── Dockerfile                 # Production image for Maritime deployment
├── docker-compose.yml         # Local development orchestrator
├── requirements.txt
├── .env.example
└── README.md
```

---

## 4. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the required environment variables:
```ini
MARITIME_API_KEY=mk_...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
ENVIRONMENT=development
LOG_LEVEL=INFO
PORT=8000
CONTROL_PLANE_PORT=8080
```

> **Security Note:** Never commit `.env` or print secret keys in logs.

---

## 5. Local Setup & Testing

### 1. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 2. Run Automated Test Suite
```bash
python -m pytest tests/
```
All 31 tests cover:
- **Tool Execution Metadata**: Invocations tracked at application level, populated in `tools_used` and `metadata["tool_executions"]`.
- **Hardened Farm Isolation**: Mismatched IDs, cross-farm diagnostic comparison, cross-farm observations, and cross-farm conversation hijacking strictly rejected (HTTP 403).
- **Asynchronous Research Execution**: Background research tasks with status transitions (`pending` -> `running` -> `completed`), citations from curated bulletins without fabrication.
- **Observation Outbox & Central Sync**: Reliable outbox pattern with idempotency tokens, retry handling, and central sync status.
- **Diagnostics**: CRUD, chronological history, and differential comparison.
- **Observations**: Persistence across restarts, unverified labelling.
- **Agent**: Tool execution, facts vs. hypotheses separation, missing data acknowledgement.
- **Maritime Runtime**: `GET /health` contract, `POST /chat` 30-second window compliance, `/data` volume validation.
- **Control Plane API**: Registration, idempotent agent provisioning, message routing.

### 3. Start Control Plane Locally
```bash
python -m uvicorn control_plane.main:app --port 8080 --reload
```
Interactive OpenAPI documentation will be available at: `http://localhost:8080/docs`

### 4. Start Agent Runtime Locally
```bash
$env:FARM_ID="FARM-001"
python -m agent_runtime.start
```

---

## 6. Demonstration Farms

Two realistic sample farms are pre-seeded in `data/seed/`:

1. **FARM-001: Brahmaputra Carp Hatchery & Grow-out**
   - **Species:** Rohu (*Labeo rohita*) and Catla (*Gibelion catla*).
   - **Diagnostic Records:** Bacterial Fin Rot (DX-001, verified), Epizootic Ulcerative Syndrome / EUS (DX-002, pending), Gill Flukes (DX-003, confirmed).
   - **Water Quality:** Normal temp/DO profiles, low ammonia.
   - **Farmer Observations:** Frayed fins in Pond 1, turbid water after monsoon rain.

2. **FARM-002: Krishna Delta Aquaculture Estate**
   - **Species:** Nile Tilapia (*Oreochromis niloticus*) and Pangasius (*Pangasianodon hypophthalmus*).
   - **Diagnostic Records:** Streptococcosis (DX-101, pop-eye and spiral swimming), Bacillary Necrosis (DX-102).
   - **Water Quality:** Elevated temp (>32°C), high ammonia (0.088 mg/L), lower DO.
   - **Farmer Observations:** 24 dead tilapia recovered, feeding cessation.

---

## 7. Control Plane API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `POST` | `/api/farms` | Register a new farm |
| `GET` | `/api/farms` | List all registered farms |
| `GET` | `/api/farms/{farm_id}` | Get farm details |
| `POST` | `/api/farms/{farm_id}/provision` | Provision dedicated Maritime agent |
| `GET` | `/api/farms/{farm_id}/agent` | Retrieve farm agent status |
| `POST` | `/api/farms/{farm_id}/message` | Send chat query to farm agent |
| `GET` | `/api/farms/{farm_id}/diagnostics` | List farm diagnostic history |
| `POST` | `/api/farms/{farm_id}/observations` | Record new farmer observation |
| `GET` | `/api/farms/{farm_id}/observations` | Retrieve farmer observations |
| `GET` | `/api/farms/{farm_id}/health-summary` | Generate holistic farm health summary |

---

## 8. Sample Queries & Agent Responses

### A. Summarize Disease History
**Query:**
```bash
curl -X POST http://localhost:8080/api/farms/FARM-001/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Summarize previous health incidents on my farm."}'
```
**Response:**
> Here is a summary of the historical health incidents for FARM-001:
> - **DX-001 (2026-10-15)**: *Bacterial Fin and Tail Rot* in Rohu (POND-01). Lab-verified with *Aeromonas hydrophila*.
> - **DX-002 (2026-11-02)**: *Epizootic Ulcerative Syndrome (EUS)* in Catla (POND-02). Pending lab verification.
> - **DX-003 (2026-11-10)**: *Monogenean Gill Fluke Infestation* in Rohu (POND-01). Field-confirmed (*Dactylogyrus spp.*).

### B. Record Farmer Observation
**Query:**
```bash
curl -X POST http://localhost:8080/api/farms/FARM-001/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Three more Rohu in Pond 1 are showing frayed fins. Save this observation."}'
```
**Response:**
> I have saved your observation: "Three more Rohu in Pond 1 are showing frayed fins." (Observation ID: `OBS-9D4DA7`).
> ⚠️ **[FARMER-REPORTED OBSERVATIONS]**: This report has been recorded as unverified field data.

### C. Missing Data Discipline
**Query:**
```bash
curl -X POST http://localhost:8080/api/farms/FARM-001/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Have I ever had Viral Nervous Necrosis (VNN) in my ponds?"}'
```
**Response:**
> Based on the verified farm records for FARM-001, there is no historical diagnostic record of Viral Nervous Necrosis (VNN).

---

## 9. Maritime Cloud Deployment Guide

Maritime gives each farm agent its own isolated Firecracker micro-VM with a persistent disk at `/data`.

### Pricing Overview
- **Agent Box (1 vCPU, 2 GB RAM)**: **$1.00 / month** per 2 GB memory ($0.033/day or billed per second), awake or asleep. Includes 5 GB persistent SSD at `/data`.
- **Sleeping Agent Box**: Same fixed $1.00/month rate (wakes automatically in ~1 second upon message delivery).
- **Control Plane**: Runs on your own backend or cloud provider at no additional Maritime cost.

### Deployment Flow:
1. **Build and Tag Image**:
   ```bash
   docker build -t your-org/finguard-agent-runtime:latest .
   docker push your-org/finguard-agent-runtime:latest
   ```
2. **Deploy to Maritime via CLI or GitHub Repo**:
   ```bash
   maritime create finguard-farm-001 --repo https://github.com/your-org/finguard-agent-runtime --json
   ```
3. **Configure Secrets**:
   ```bash
   maritime env set finguard-farm-001 GEMINI_API_KEY=$GEMINI_API_KEY FARM_ID=FARM-001 --reload --json
   ```
4. **Verify Health and Chat**:
   ```bash
   maritime status finguard-farm-001 --json
   maritime chat finguard-farm-001 "Summarize the previous health incidents on my farm." --json
   ```

---

## 10. Integration & Production Readiness Deliverables

- **[Express Integration Contract](EXPRESS_INTEGRATION_CONTRACT.md)**: Formal contract specification detailing Express backend endpoints, outbox synchronization, `Idempotency-Key` headers, chat relay, and Firecracker micro-VM hibernation mechanics.
- **[Production Readiness Audit Report](FARMAGENT_PRODUCTION_READINESS.md)**: Comprehensive verification report categorizing verified local functionality (44/44 passing automated tests), mock-tested modules, sleeping machine recovery, and deployment preparations.

---

## 11. Future FinGuard.io & VoiceExpert Integration

This repository is completely self-contained. For the upcoming **FinGuard-VoiceExpert** milestone:
1. The Voice Expert gateway will connect directly to `POST /api/farms/{farm_id}/message`.
2. Farmer audio inputs will be transcribed and passed to the agent runtime, preserving full farm context, tool execution tracking, and tenant isolation.
3. Research workflows can be extended with central lab confirmation records and Qdrant vector retrieval.

