import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';
import http from 'http';

describe('Farmer Observation Synchronization & Central Persistence Contract', { timeout: 15000 }, () => {
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

  it('successfully commits an observation with valid farm authorization', async () => {
    const idempotencyKey = `TEST-IDEM-${Date.now()}`;
    const payload = {
      observation_id: `OBS-TEST-${Date.now()}`,
      farm_id: 'FARM-001',
      pond_id: 'POND-01',
      observation_type: 'behavioral',
      description: 'Tilapia schooling at surface near aerator; reduced feeding activity.',
      reported_by: 'Rajesh Patel (Manager)',
      timestamp: new Date().toISOString()
    };

    const res = await fetch(`${baseUrl}/api/v1/farms/FARM-001/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'X-FinGuard-Service-Key': 'finguard-internal-secret-key-2026'
      },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.central_id).toBeDefined();
    expect(data.committed_at).toBeDefined();
  });

  it('guarantees idempotency on duplicate outbox delivery without creating duplicate records', async () => {
    const fixedIdempotencyKey = `STABLE-KEY-${Date.now()}`;
    const payload = {
      observation_id: `OBS-DUP-${Date.now()}`,
      farm_id: 'FARM-001',
      pond_id: 'POND-01',
      observation_type: 'water_quality',
      description: 'Pond water exhibiting slight green-algal bloom surface film.',
      reported_by: 'Farm Supervisor'
    };

    // First delivery
    const res1 = await fetch(`${baseUrl}/api/v1/farms/FARM-001/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': fixedIdempotencyKey,
        'X-FinGuard-Service-Key': 'finguard-internal-secret-key-2026'
      },
      body: JSON.stringify(payload)
    });
    expect(res1.status).toBe(201);
    const data1 = await res1.json();
    const firstCentralId = data1.central_id;

    // Retry delivery with same idempotency key
    const res2 = await fetch(`${baseUrl}/api/v1/farms/FARM-001/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': fixedIdempotencyKey,
        'X-FinGuard-Service-Key': 'finguard-internal-secret-key-2026'
      },
      body: JSON.stringify(payload)
    });

    expect(res2.status).toBe(409); // Idempotent conflict or 200 with duplicate flag
    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    expect(data2.duplicate).toBe(true);
    expect(data2.central_id).toBe(firstCentralId);
  });

  it('rejects observation ingestion when URL farmId does not match body farm_id', async () => {
    const payload = {
      observation_id: 'OBS-MISMATCH-1',
      farm_id: 'FARM-OTHER-999',
      description: 'Attempting to inject into FARM-001 with foreign farm_id in payload.'
    };

    const res = await fetch(`${baseUrl}/api/v1/farms/FARM-001/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FinGuard-Service-Key': 'finguard-internal-secret-key-2026'
      },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Tenant Authorization Violation');
  });

  it('retrieves committed observations through the central observations API', async () => {
    const res = await fetch(`${baseUrl}/api/v1/farms/FARM-001/observations`, {
      headers: {
        'X-FinGuard-Service-Key': 'finguard-internal-secret-key-2026'
      }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.observations)).toBe(true);
    expect(data.observations.length).toBeGreaterThan(0);
  });
});
