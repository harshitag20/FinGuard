import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';
import http from 'http';

describe('FarmAgent Fleet & Tenant Isolation Contract', { timeout: 15000 }, () => {
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

  it('allows authorized farm tenant to access agent messaging', async () => {
    const res = await fetch(`${baseUrl}/api/farms/FARM-001/agent/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What was the dissolved oxygen trend in Pond 1 yesterday?',
        conversation_id: 'conv-farm-001-test'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.farm_id).toBe('FARM-001');
    expect(data.response).toBeDefined();
  });

  it('blocks unauthorized access to foreign farm agent with HTTP 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/farms/UNAUTHORIZED-FOREIGN-FARM-999/agent/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Attempting unauthorized intrusion into foreign farm agent.'
      })
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Tenant Isolation Violation');
  });

  it('supports creating and querying asynchronous scientific research tasks', async () => {
    // 1. Dispatch research task
    const createRes = await fetch(`${baseUrl}/api/farms/FARM-001/agent/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Efficacy of oxytetracycline immersion versus florfenicol oral feed for Edwardsiella ictaluri',
        related_diagnosis_id: 'DX-77124B'
      })
    });

    expect([200, 202]).toContain(createRes.status);
    const created = await createRes.json();
    expect(created.success).toBe(true);
    expect(created.research_task_id).toBeDefined();

    // 2. Poll research task
    const pollRes = await fetch(`${baseUrl}/api/farms/FARM-001/agent/research/${created.research_task_id}`);
    expect(pollRes.status).toBe(200);
    const taskData = await pollRes.json();
    expect(taskData.success).toBe(true);
    expect(taskData.research_task_id).toBe(created.research_task_id);
    expect(taskData.findings).toBeDefined();
  });

  it('serves authoritative central farm profile to agent data-providers', async () => {
    const res = await fetch(`${baseUrl}/api/farms/FARM-001/profile`, {
      headers: {
        'X-FinGuard-Service-Key': 'finguard-internal-secret-key-2026'
      }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.profile.farm_id).toBe('FARM-001');
    expect(Array.isArray(data.profile.ponds)).toBe(true);
  });

  it('serves authoritative central diagnostics to agent data-providers', async () => {
    const res = await fetch(`${baseUrl}/api/farms/FARM-001/diagnostics`, {
      headers: {
        'X-FinGuard-Service-Key': 'finguard-internal-secret-key-2026'
      }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.diagnostics)).toBe(true);
  });
});
