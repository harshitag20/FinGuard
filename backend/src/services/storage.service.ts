/**
 * FinGuard.io - Persistent Local Storage Layer
 * Persists farms, ponds, simulation states, alert logs, and screening histories
 * into a JSON database so data survives restarts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PondConfig, UserData, DiseaseScreeningResult, TelemetryAlert, PondMetrics } from '../../../shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CentralObservation {
  central_id: string;
  observation_id: string;
  idempotency_key: string;
  farm_id: string;
  pond_id: string;
  observation_type: string;
  description: string;
  reported_by: string;
  timestamp: string;
  source: string;
  related_diagnosis_id?: string;
  committed_at: string;
}

interface DatabaseSchema {
  user: UserData | null;
  ponds: PondConfig[];
  telemetryHistory: Record<string, PondMetrics[]>;
  alerts: TelemetryAlert[];
  screeningHistory: DiseaseScreeningResult[];
  observations: CentralObservation[];
}

const DB_DIR = process.env.DATABASE_DIR
  ? path.resolve(process.env.DATABASE_DIR)
  : (process.env.VERCEL ? path.join('/tmp', 'finguard_data') : path.resolve(__dirname, '..', 'data'));
const DB_FILE = process.env.DATABASE_FILE || path.join(DB_DIR, 'finguard_db.json');

const INITIAL_DB: DatabaseSchema = {
  user: null,
  ponds: [
    {
      id: 'POND-01',
      name: 'Pond 1 - North Growout',
      tankSize: '1.2 Hectares (Earthen)',
      fishCount: 8500,
      speciesIds: ['rohu', 'catla', 'mrigal'],
      metrics: {
        temp: 28.2,
        ph: 7.6,
        oxygen: 6.4,
        ammonia: 0.02,
        nitrite: 0.03,
        salinity: 0.5,
        timestamp: Date.now(),
        isSimulated: true
      },
      healthScore: 92,
      isSimulated: true,
      status: 'NORMAL',
      createdAt: '2026-03-01T10:00:00Z'
    },
    {
      id: 'POND-02',
      name: 'Pond 2 - South Broodstock',
      tankSize: '0.8 Hectares',
      fishCount: 4200,
      speciesIds: ['rohu', 'scampi'],
      metrics: {
        temp: 29.0,
        ph: 7.8,
        oxygen: 5.8,
        ammonia: 0.03,
        nitrite: 0.04,
        salinity: 1.2,
        timestamp: Date.now(),
        isSimulated: true
      },
      healthScore: 88,
      isSimulated: true,
      status: 'NORMAL',
      createdAt: '2026-03-01T10:00:00Z'
    }
  ],
  telemetryHistory: {},
  alerts: [],
  screeningHistory: [],
  observations: []
};

class StorageManager {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDir();
    this.db = this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[Storage] Failed to read DB file, initializing fresh database.', err);
    }
    this.save(INITIAL_DB);
    return INITIAL_DB;
  }

  private save(data: DatabaseSchema) {
    try {
      this.ensureDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Storage] Error writing database:', err);
    }
  }

  public getUser(): UserData | null {
    return this.db.user;
  }

  public saveUser(user: UserData): UserData {
    this.db.user = user;
    this.save(this.db);
    return this.db.user;
  }

  public getPonds(): PondConfig[] {
    return this.db.ponds;
  }

  public getPondById(id: string): PondConfig | undefined {
    return this.db.ponds.find(p => p.id === id);
  }

  public savePond(pond: PondConfig): PondConfig {
    const idx = this.db.ponds.findIndex(p => p.id === pond.id);
    if (idx >= 0) {
      this.db.ponds[idx] = pond;
    } else {
      this.db.ponds.push(pond);
    }
    this.save(this.db);
    return pond;
  }

  public recordTelemetry(pondId: string, metrics: PondMetrics) {
    if (!this.db.telemetryHistory[pondId]) {
      this.db.telemetryHistory[pondId] = [];
    }
    this.db.telemetryHistory[pondId].unshift(metrics);
    // Keep max 200 recent records per pond
    if (this.db.telemetryHistory[pondId].length > 200) {
      this.db.telemetryHistory[pondId].pop();
    }

    // Update pond metrics in place
    const pond = this.getPondById(pondId);
    if (pond) {
      pond.metrics = metrics;
      this.savePond(pond);
    }
  }

  public getTelemetry(pondId: string, limit: number = 30): PondMetrics[] {
    if (this.db.telemetryHistory[pondId] && this.db.telemetryHistory[pondId].length > 0) {
      return this.db.telemetryHistory[pondId].slice(0, limit);
    }
    // If queried with farmId, fallback to first available pond telemetry
    const ponds = this.getPonds();
    for (const p of ponds) {
      if (this.db.telemetryHistory[p.id] && this.db.telemetryHistory[p.id].length > 0) {
        return this.db.telemetryHistory[p.id].slice(0, limit);
      }
    }
    return [];
  }

  public addAlert(alert: TelemetryAlert) {
    this.db.alerts.unshift(alert);
    if (this.db.alerts.length > 100) {
      this.db.alerts.pop();
    }
    this.save(this.db);
  }

  public getAlerts(limit: number = 20): TelemetryAlert[] {
    return this.db.alerts.slice(0, limit);
  }

  public clearAlerts() {
    this.db.alerts = [];
    this.save(this.db);
  }

  public dismissAlert(alertId: string) {
    this.db.alerts = this.db.alerts.filter(a => a.id !== alertId);
    this.save(this.db);
  }

  public saveScreeningResult(result: DiseaseScreeningResult): DiseaseScreeningResult {
    const idx = this.db.screeningHistory.findIndex(s => s.id === result.id);
    if (idx >= 0) {
      this.db.screeningHistory[idx] = result;
    } else {
      this.db.screeningHistory.unshift(result);
    }
    if (this.db.screeningHistory.length > 50) {
      this.db.screeningHistory.pop();
    }
    this.save(this.db);
    return result;
  }

  public getScreeningHistory(): DiseaseScreeningResult[] {
    return this.db.screeningHistory;
  }

  public getScreeningResultById(id: string): DiseaseScreeningResult | undefined {
    return this.db.screeningHistory.find(s => s.id === id);
  }

  public saveObservation(payload: any, idempotencyKey: string): { record: CentralObservation; isDuplicate: boolean } {
    if (!this.db.observations) {
      this.db.observations = [];
    }

    const existing = this.db.observations.find(
      o => o.idempotency_key === idempotencyKey || (payload.observation_id && o.observation_id === payload.observation_id)
    );

    if (existing) {
      return { record: existing, isDuplicate: true };
    }

    const centralId = `CENTRAL-OBS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const committedAt = new Date().toISOString();

    const record: CentralObservation = {
      central_id: centralId,
      observation_id: payload.observation_id || `OBS-${Date.now()}`,
      idempotency_key: idempotencyKey,
      farm_id: payload.farm_id,
      pond_id: payload.pond_id || 'Pond-01',
      observation_type: payload.observation_type || 'general',
      description: payload.description || '',
      reported_by: payload.reported_by || 'Farmer',
      timestamp: payload.timestamp || committedAt,
      source: payload.source || 'farmer_chat',
      related_diagnosis_id: payload.related_diagnosis_id,
      committed_at: committedAt
    };

    this.db.observations.unshift(record);
    if (this.db.observations.length > 500) {
      this.db.observations.pop();
    }
    this.save(this.db);
    return { record, isDuplicate: false };
  }

  public getObservations(farmId?: string): CentralObservation[] {
    if (!this.db.observations) return [];
    if (!farmId) return this.db.observations;
    return this.db.observations.filter(o => o.farm_id === farmId);
  }

  public getFarmProfile(farmId: string): any {
    const user = this.getUser();
    const ponds = this.getPonds();
    return {
      farm_id: farmId,
      farm_name: user?.name ? `${user.name}'s Aquaculture Farm` : 'Godavari Delta Aquaculture Farm',
      owner_name: user?.name || 'Rajesh Patel',
      location: user?.location || 'Bhimavaram, West Godavari, Andhra Pradesh',
      coordinates: { latitude: 16.54, longitude: 81.52 },
      total_ponds: ponds.length,
      ponds: ponds.map(p => ({
        pond_id: p.id,
        name: p.name,
        size_hectares: p.tankSize,
        species: p.speciesIds,
        stock_count: p.fishCount,
        status: p.status
      })),
      last_updated: new Date().toISOString()
    };
  }

  public getDiagnosticsForFarm(farmId: string): DiseaseScreeningResult[] {
    const history = this.getScreeningHistory();
    return history.filter(s => !(s as any).farm_id || (s as any).farm_id === farmId);
  }
}

export const storage = new StorageManager();

