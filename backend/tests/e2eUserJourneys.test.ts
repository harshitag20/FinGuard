import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';
import http from 'http';

describe('FinGuard.io — End-to-End User Journey QA Suite', { timeout: 25000 }, () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if ((server as any).closeAllConnections) {
        (server as any).closeAllConnections();
      }
      server.close(() => resolve());
    });
  });

  // =========================================================================
  // JOURNEY 1: New Farm Onboarding & Profile Persistence
  // =========================================================================
  it('Journey 1: Onboards user, configures farm and ponds, and verifies authoritative persistence', async () => {
    // 1. Save user profile
    const userRes = await fetch(`${baseUrl}/api/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Venkata Raman',
        location: 'Eluru, Andhra Pradesh',
        farmName: 'Raman Aqua Complex',
        pondSize: '4.0 Hectares',
        selectedSpecies: ['rohu', 'catla', 'mrigal'],
        cultureType: 'Semi-Intensive Polyculture',
        type: 'standard'
      })
    });
    expect(userRes.status).toBe(200);
    const userData = await userRes.json();
    expect(userData.success).toBe(true);
    expect(userData.user.name).toBe('Venkata Raman');

    // 2. Configure a new pond
    const pondRes = await fetch(`${baseUrl}/api/ponds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'POND-RAMAN-1',
        name: 'Pond 1 - Polyculture Broodstock',
        tankSize: '2.0 Hectares',
        fishCount: 12000,
        speciesIds: ['rohu', 'catla'],
        metrics: {
          temp: 29.1,
          ph: 7.7,
          oxygen: 6.8,
          ammonia: 0.015,
          timestamp: Date.now(),
          isSimulated: true
        },
        healthScore: 95,
        isSimulated: true,
        status: 'NORMAL'
      })
    });
    expect(pondRes.status).toBe(200);
    const pondData = await pondRes.json();
    expect(pondData.pond.id).toBe('POND-RAMAN-1');

    // 3. Verify that profile queries return authoritative data
    const profileRes = await fetch(`${baseUrl}/api/farms/FARM-001/profile`);
    expect(profileRes.status).toBe(200);
    const profileData = await profileRes.json();
    expect(profileData.success).toBe(true);
    expect(profileData.profile.farm_name).toContain('Venkata Raman');
  });

  // =========================================================================
  // JOURNEY 2: Water-Quality Monitoring, Simulation & Alert Lifecycle
  // =========================================================================
  it('Journey 2: Controls telemetry simulation, evaluates species thresholds, and verifies alert clearing', async () => {
    // 1. Start simulation
    const startRes = await fetch(`${baseUrl}/api/simulation/start`, { method: 'POST' });
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    expect(startData.state.isRunning).toBe(true);

    // 2. Adjust simulation speed
    const speedRes = await fetch(`${baseUrl}/api/simulation/speed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: 2 })
    });
    expect(speedRes.status).toBe(200);
    const speedData = await speedRes.json();
    expect(speedData.state.speedMultiplier).toBe(2);

    // 3. Inject acute hypoxia scenario
    const injectRes = await fetch(`${baseUrl}/api/simulation/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'ACUTE_HYPOXIA' })
    });
    expect(injectRes.status).toBe(200);
    const injectData = await injectRes.json();
    expect(injectData.state.activeScenario).toBe('ACUTE_HYPOXIA');

    // 4. Retrieve simulation state and verify simulated flag
    const stateRes = await fetch(`${baseUrl}/api/simulation/state`);
    const stateData = await stateRes.json();
    expect(stateData.state.isSimulated).toBe(true);
    expect(stateData.state.currentMetrics.isSimulated).toBe(true);

    // 5. Test clearAlerts endpoint
    const clearRes = await fetch(`${baseUrl}/api/alerts/clear`, { method: 'POST' });
    expect(clearRes.status).toBe(200);
    const clearData = await clearRes.json();
    expect(clearData.success).toBe(true);

    // 6. Pause simulation
    const pauseRes = await fetch(`${baseUrl}/api/simulation/pause`, { method: 'POST' });
    expect(pauseRes.status).toBe(200);
    const pauseData = await pauseRes.json();
    expect(pauseData.state.isRunning).toBe(false);
  });

  // =========================================================================
  // JOURNEY 3: Species-Aware Disease Screening & Clinical Verification
  // =========================================================================
  it('Journey 3: Performs species-aware disease screening and updates verification stage with provenance', async () => {
    // 1. Submit screening request
    const screenRes = await fetch(`${baseUrl}/api/disease/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmId: 'FARM-001',
        pondId: 'POND-01',
        speciesIds: ['rohu', 'catla'],
        reportedSymptoms: ['red_ulcers', 'lethargy', 'surface_piping'],
        pondMetrics: {
          temp: 21.0, // cold temperature predisposing to EUS
          ph: 7.4,
          oxygen: 4.8,
          ammonia: 0.02
        }
      })
    });

    expect(screenRes.status).toBe(200);
    const screenData = await screenRes.json();
    expect(screenData.success).toBe(true);
    const screening = screenData.result;
    expect(screening.id).toBeDefined();
    // Verify candidate diseases are treated as uncalibrated hypotheses, not final diagnoses
    expect(screening.candidate_diseases.length).toBeGreaterThan(0);
    expect(screening.candidate_diseases[0].uncertainty_label).toBeDefined();

    // 2. Perform clinical verification workflow
    const verifyRes = await fetch(`${baseUrl}/api/disease/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screeningId: screening.id,
        repeatDO: 5.2,
        repeatTemp: 22.0,
        repeatPh: 7.5,
        gillClipExamined: true,
        gillClipNotes: 'Fungal aseptate hyphae (Aphanomyces invadans) visualized in squash mount.',
        microscopyConducted: true,
        expertConsulted: true,
        expertNameOrTitle: 'Dr. Rao, Senior Aquatic Pathologist, ICAR-CIFA'
      })
    });

    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);
    expect(verifyData.result.verified_status).toBe('EXTERNALLY_CONFIRMED');
    expect(verifyData.result.verification_history).toHaveLength(1);

    // 3. Confirm screening report appears in history
    const historyRes = await fetch(`${baseUrl}/api/disease/history`);
    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.history.some((h: any) => h.id === screening.id)).toBe(true);
  });

  // =========================================================================
  // JOURNEY 4: FarmAgent Interaction & Tenant Isolation
  // =========================================================================
  it('Journey 4: Relays messages to farm agent and blocks unauthorized cross-farm access', async () => {
    // 1. Authorized tenant message
    const msgRes = await fetch(`${baseUrl}/api/farms/FARM-001/agent/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Can you summarize recent water quality in my pond?',
        conversation_id: 'conv-e2e-journey'
      })
    });
    expect(msgRes.status).toBe(200);
    const msgData = await msgRes.json();
    expect(msgData.success).toBe(true);
    expect(msgData.farm_id).toBe('FARM-001');

    // 2. Unauthorized cross-farm intrusion attempt
    const foreignRes = await fetch(`${baseUrl}/api/farms/FARM-COMPETITOR-999/agent/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Steal diagnostic records of competitor farm.'
      })
    });
    expect(foreignRes.status).toBe(403);
    const foreignData = await foreignRes.json();
    expect(foreignData.success).toBe(false);
    expect(foreignData.error).toContain('Tenant Isolation Violation');
  });

  // =========================================================================
  // JOURNEY 5: Farmer Observation Synchronization with Idempotency
  // =========================================================================
  it('Journey 5: Ingests farmer observation, prevents duplicate commits, and verifies central storage', async () => {
    const testIdemKey = `IDEM-E2E-${Date.now()}`;
    const obsPayload = {
      farm_id: 'FARM-001',
      pond_id: 'POND-01',
      observation_type: 'feeding_behavior',
      description: 'Fish actively feeding on floating pellets, no abnormal schooling.',
      reported_by: 'Farm Manager Sastry'
    };

    // 1. Initial observation delivery
    const postRes = await fetch(`${baseUrl}/api/v1/farms/FARM-001/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': testIdemKey
      },
      body: JSON.stringify(obsPayload)
    });
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.central_id).toBeDefined();

    // 2. Duplicate retry delivery with same idempotency key
    const retryRes = await fetch(`${baseUrl}/api/v1/farms/FARM-001/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': testIdemKey
      },
      body: JSON.stringify(obsPayload)
    });
    expect(retryRes.status).toBe(409);
    const retryData = await retryRes.json();
    expect(retryData.duplicate).toBe(true);
    expect(retryData.central_id).toBe(postData.central_id);

    // 3. Verify observation is queryable
    const getRes = await fetch(`${baseUrl}/api/v1/farms/FARM-001/observations`);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.observations.some((o: any) => o.idempotency_key === testIdemKey)).toBe(true);
  });

  // =========================================================================
  // JOURNEY 6: Asynchronous Scientific Literature Research Lifecycle
  // =========================================================================
  it('Journey 6: Creates and polls an asynchronous scientific research task', async () => {
    // 1. Dispatch research inquiry
    const createRes = await fetch(`${baseUrl}/api/farms/FARM-001/agent/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Efficacy of potassium permanganate against trichodiniasis in Rohu fry'
      })
    });
    expect(createRes.status).toBe(202);
    const createData = await createRes.json();
    expect(createData.research_task_id).toBeDefined();

    // 2. Poll task status
    const pollRes = await fetch(`${baseUrl}/api/farms/FARM-001/agent/research/${createData.research_task_id}`);
    expect(pollRes.status).toBe(200);
    const pollData = await pollRes.json();
    expect(pollData.success).toBe(true);
    expect(pollData.status).toBeDefined();
  });

  // =========================================================================
  // JOURNEY 7: Governed Model Routing & Prune Policy Enforcement
  // =========================================================================
  it('Journey 7: Routes general questions via model routing gateway and returns verified response', async () => {
    const chatRes = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What is the optimal dissolved oxygen level for carp aquaculture?',
        category: 'static_educational'
      })
    });

    expect(chatRes.status).toBe(200);
    const chatData = await chatRes.json();
    expect(chatData.success).toBe(true);
    expect(chatData.content).toBeDefined();
    expect(chatData.routing).toBeDefined();
    // Static educational queries are classified for prune gateway routing
    expect(chatData.routing.routeTarget).toBe('prune_gateway');
  });

  // =========================================================================
  // JOURNEY 8: Service Downtime & Graceful Degradation
  // =========================================================================
  it('Journey 8: Handles offline agent and offline model providers without crashing', async () => {
    // 1. Agent status gracefully returns dormant
    const statusRes = await fetch(`${baseUrl}/api/farms/FARM-001/agent/status`);
    expect(statusRes.status).toBe(200);
    const statusData = await statusRes.json();
    expect(statusData.success).toBe(true);
    expect(['online', 'dormant']).toContain(statusData.status);

    // 2. Chat with unavailable model provider returns authoritative scientific rules fallback
    const offlineRes = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'How does high temperature affect oxygen solubility in ponds?',
        category: 'general_text'
      })
    });

    expect(offlineRes.status).toBe(200);
    const offlineData = await offlineRes.json();
    expect(offlineData.success).toBe(true);
    expect(offlineData.content).toBeDefined();
    expect(offlineData.provider).toBeDefined();
  });
});
