# FinGuard AI Gateway: Demonstration Environment

This standalone demonstration allows testing and inspecting FinGuard request routing, Prune Shield enforcement, and receipt normalization without connecting to live billing services by default.

---

## 1. Running the CLI Demonstration

The CLI runner executes 5 representative FinGuard request categories:
1. **General Text Request**: Proxied through Prune Gateway.
2. **Clinical Disease Diagnosis**: Proxied through Prune Gateway with mandatory `X-Prune-Cache: off`.
3. **Farm Agent Task Loop**: Proxied through Prune Gateway with agent run tracking (`run_id`, `run_budget_usd`, `max_steps`).
4. **Voice Session (Gemini Live)**: Isolated to direct provider path.
5. **Multimodal Image Request**: Preserved on direct Gemini provider path pending gateway image forwarding verification.

### Run in Offline Mock Mode (Zero Billable Requests)
```bash
python demo/demo_cli.py
```

### Run with a Specific Sample Request
```bash
python demo/demo_cli.py --request demo/sample_requests/disease_diagnosis.json
```

### Run in Live Mode (Opt-In with Valid Prune Key)
```bash
$env:PRUNE_API_KEY="prune_live_..."
python demo/demo_cli.py --live
```

---

## 2. Sample Requests Available

| Sample File | Category | Tested Policy / Header | Expected Route |
| :--- | :--- | :--- | :--- |
| `sample_requests/general_text.json` | `general_text` | `X-Prune-Feature-Id: general_chat` | `prune_gateway` |
| `sample_requests/disease_diagnosis.json` | `disease_diagnosis` | `X-Prune-Cache: off` | `prune_gateway` |
| `sample_requests/farm_telemetry.json` | `farm_conversation` | `X-Prune-Run-Budget-Usd: 0.05` | `prune_gateway` |
| `sample_requests/voice_live_bypass.json` | `voice_live` | WebSockets / Live Audio isolation | `direct_gemini` |
| `sample_requests/multimodal_bypass.json` | `multimodal_image` | Image input verification guard | `direct_gemini` |

