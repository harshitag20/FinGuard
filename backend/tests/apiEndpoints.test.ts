import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';
import http from 'http';

describe('FinGuard Express Backend API Endpoints', { timeout: 15000 }, () => {
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

  it('GET /api/species returns all supported aquaculture species with scientific profiles', async () => {
    const res = await fetch(`${baseUrl}/api/species`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.species.length).toBeGreaterThanOrEqual(10);
    
    // Check Rohu has valid temperature parameters with source citations
    const rohu = data.species.find((s: any) => s.id === 'rohu');
    expect(rohu).toBeDefined();
    expect(rohu.parameters.temp.sourceTitle).toContain('FAO');
  });

  it('POST /api/species/overlap calculates mathematical interval intersection', async () => {
    const res = await fetch(`${baseUrl}/api/species/overlap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speciesIds: ['rohu', 'catla', 'mrigal'] })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.report.overallCompatibility).toBe('COMPATIBLE');
    expect(data.report.parameters.oxygen.hasOverlap).toBe(true);
  });

  it('POST /api/disease/screen returns structured JSON response adhering to schema', async () => {
    const res = await fetch(`${baseUrl}/api/disease/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speciesIds: ['rohu'],
        pondId: 'POND-01',
        reportedSymptoms: ['visible_lesions'],
        pondMetrics: { temp: 23, ph: 6.8, oxygen: 5.2, ammonia: 0.04 }
      })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.result.status).toBe('screening_only');
    expect(data.result.candidate_diseases.length).toBeGreaterThan(0);
    expect(data.result.limitations.length).toBeGreaterThan(0);
  });

  it('GET /api/simulation/state returns live telemetry state', async () => {
    const res = await fetch(`${baseUrl}/api/simulation/state`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.state.isSimulated).toBe(true);
    expect(data.state.currentMetrics.oxygen).toBeDefined();
  });

  it('GET /api/datasets discovers Kaggle reference manifests', async () => {
    const res = await fetch(`${baseUrl}/api/datasets`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.datasets.length).toBeGreaterThan(0);
    expect(data.datasets[0].license).toBeDefined();
  });
});

