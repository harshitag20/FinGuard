/**
 * FinGuard.io - Deterministic Pond Water Quality Simulation Engine
 * Generates realistic diurnal oscillations, gradual environmental drifts,
 * and testable anomaly scenarios with hysteresis alert tracking.
 */

import { PondMetrics, SimulationState, TelemetryAlert } from '../../../shared/types';
import { SPECIES_CATALOG } from '../../../shared/speciesCatalog';
import { storage } from './storage.service';

interface HysteresisState {
  breachCounts: Record<string, number>;
  activeAlertSeverities: Record<string, 'WARNING' | 'CRITICAL' | null>;
  recoveryCounts: Record<string, number>;
}

export class SimulationEngine {
  private isRunning: boolean = false;
  private speedMultiplier: number = 1; // 1x = 1 tick every 5s
  private activeScenario: SimulationState['activeScenario'] = 'BASELINE';
  private stepCount: number = 0;
  private seed: number = 42;
  private timer: NodeJS.Timeout | null = null;
  private pondId: string = 'POND-01';

  // Hysteresis configuration: require 2 consecutive breach samples to alert,
  // and 2 consecutive normal samples within clearance deadband to resolve.
  private hysteresis: HysteresisState = {
    breachCounts: {},
    activeAlertSeverities: {},
    recoveryCounts: {}
  };

  private currentMetrics: PondMetrics = {
    temp: 28.5,
    ph: 7.7,
    oxygen: 6.2,
    ammonia: 0.02,
    nitrite: 0.03,
    salinity: 0.5,
    timestamp: Date.now(),
    isSimulated: true
  };

  constructor(pondId: string = 'POND-01') {
    this.pondId = pondId;
    // Simulation is stopped by default; opened only when user explicitly allows it
  }

  // Linear Congruential Generator for reproducible pseudo-random noise
  private pseudoRandom(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  private gaussianNoise(stdDev: number = 0.05): number {
    const u1 = Math.max(1e-6, this.pseudoRandom());
    const u2 = this.pseudoRandom();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * stdDev;
  }

  public getState(): SimulationState {
    return {
      isRunning: this.isRunning,
      speedMultiplier: this.speedMultiplier,
      activeScenario: this.activeScenario,
      stepCount: this.stepCount,
      currentMetrics: { ...this.currentMetrics },
      seed: this.seed,
      isSimulated: true
    };
  }

  public start() {
    this.isRunning = true;
    if (this.timer) clearInterval(this.timer);
    const interval = Math.max(1000, Math.floor(5000 / this.speedMultiplier));
    this.timer = setInterval(() => this.tick(), interval);
  }

  public pause() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public reset(seed: number = 42) {
    this.seed = seed;
    this.stepCount = 0;
    this.activeScenario = 'BASELINE';
    this.hysteresis = {
      breachCounts: {},
      activeAlertSeverities: {},
      recoveryCounts: {}
    };
    this.currentMetrics = {
      temp: 28.5,
      ph: 7.7,
      oxygen: 6.2,
      ammonia: 0.02,
      nitrite: 0.03,
      salinity: 0.5,
      timestamp: Date.now(),
      isSimulated: true
    };
    storage.recordTelemetry(this.pondId, this.currentMetrics);
  }

  public setSpeed(speed: number) {
    this.speedMultiplier = Math.max(0.5, Math.min(10, speed));
    if (this.isRunning) {
      this.start();
    }
  }

  public triggerScenario(scenario: SimulationState['activeScenario']) {
    this.activeScenario = scenario;
    this.stepCount = 0; // reset local scenario clock
  }

  public tick(): PondMetrics {
    this.stepCount++;
    const t = this.stepCount;

    // Diurnal baseline oscillation (representing solar cycle)
    const diurnalTemp = 28.0 + 1.8 * Math.sin(t * 0.1);
    const diurnalPh = 7.7 + 0.3 * Math.sin(t * 0.1);
    let targetDO = 6.2 + 0.8 * Math.sin(t * 0.1);
    let targetTAN = 0.025 + 0.005 * Math.sin(t * 0.05);

    // Apply scenario dynamics
    switch (this.activeScenario) {
      case 'NOCTURNAL_HYPOXIA':
        // Steps 1-5: Rapid drop in DO due to algal respiration
        // Steps 6-12: Sustained hypoxic crisis (< 2.8 mg/L)
        // Steps 13-20: Emergency aeration activated, gradual recovery
        // Step 21+: Returns to BASELINE
        if (t <= 5) {
          targetDO = 6.0 - (t * 0.7); // drops to ~2.5
        } else if (t <= 12) {
          targetDO = 2.4 + this.gaussianNoise(0.15); // dangerous hypoxia
        } else if (t <= 18) {
          targetDO = 2.4 + ((t - 12) * 0.55); // aeration recovery
        } else {
          targetDO = 5.8;
          this.activeScenario = 'BASELINE'; // Auto recovery
        }
        break;

      case 'ACID_RAIN_PH_DROP':
        if (t <= 8) {
          this.currentMetrics.ph = Math.max(5.8, 7.6 - (t * 0.22));
        } else if (t <= 15) {
          this.currentMetrics.ph = 5.9 + this.gaussianNoise(0.08);
        } else {
          this.currentMetrics.ph = Math.min(7.5, 5.9 + ((t - 15) * 0.3));
          if (this.currentMetrics.ph >= 7.2) this.activeScenario = 'BASELINE';
        }
        break;

      case 'AMMONIA_SPIKE':
        if (t <= 10) {
          targetTAN = 0.02 + (t * 0.018); // reaches 0.20 mg/L TAN
        } else if (t <= 16) {
          targetTAN = 0.20 + this.gaussianNoise(0.015);
        } else {
          targetTAN = Math.max(0.03, 0.20 - ((t - 16) * 0.03));
          if (targetTAN <= 0.04) this.activeScenario = 'BASELINE';
        }
        break;

      case 'COLD_SNAP':
        if (t <= 8) {
          this.currentMetrics.temp = Math.max(17.5, 28.0 - (t * 1.3));
        } else if (t <= 15) {
          this.currentMetrics.temp = 17.5 + this.gaussianNoise(0.2);
        } else {
          this.currentMetrics.temp = Math.min(26.5, 17.5 + ((t - 15) * 1.5));
          if (this.currentMetrics.temp >= 25.5) this.activeScenario = 'BASELINE';
        }
        break;

      case 'BASELINE':
      default:
        // Pure baseline with realistic bounded noise
        break;
    }

    if (this.activeScenario !== 'ACID_RAIN_PH_DROP') {
      this.currentMetrics.ph = Math.max(5.0, Math.min(10.0, diurnalPh + this.gaussianNoise(0.04)));
    }
    if (this.activeScenario !== 'COLD_SNAP') {
      this.currentMetrics.temp = Math.max(12.0, Math.min(38.0, diurnalTemp + this.gaussianNoise(0.1)));
    }
    this.currentMetrics.oxygen = Math.max(0.5, Math.min(14.0, targetDO + this.gaussianNoise(0.08)));
    this.currentMetrics.ammonia = Math.max(0.005, Math.min(0.6, targetTAN + Math.abs(this.gaussianNoise(0.004))));
    this.currentMetrics.nitrite = Math.max(0.01, Math.min(0.5, 0.025 + Math.abs(this.gaussianNoise(0.005))));
    this.currentMetrics.salinity = 0.5 + Math.abs(this.gaussianNoise(0.02));
    this.currentMetrics.timestamp = Date.now();
    this.currentMetrics.isSimulated = true;

    // Round for display fidelity
    this.currentMetrics.temp = Number(this.currentMetrics.temp.toFixed(1));
    this.currentMetrics.ph = Number(this.currentMetrics.ph.toFixed(2));
    this.currentMetrics.oxygen = Number(this.currentMetrics.oxygen.toFixed(2));
    this.currentMetrics.ammonia = Number(this.currentMetrics.ammonia.toFixed(3));
    this.currentMetrics.nitrite = Number(this.currentMetrics.nitrite?.toFixed(3));
    this.currentMetrics.salinity = Number(this.currentMetrics.salinity?.toFixed(2));

    // Save reading to storage
    storage.recordTelemetry(this.pondId, this.currentMetrics);

    // Evaluate species-aware alerts with hysteresis
    this.evaluateAlerts();

    return this.currentMetrics;
  }

  private evaluateAlerts() {
    const pond = storage.getPondById(this.pondId);
    const speciesIds = pond?.speciesIds || ['rohu', 'catla', 'mrigal'];
    const speciesList = speciesIds.map(id => SPECIES_CATALOG[id]).filter(Boolean);
    if (speciesList.length === 0) return;

    // Find strictest optimal/warning/critical boundaries across selected species
    // For oxygen, lower bound is critical
    const minDOOptimal = Math.max(...speciesList.map(s => s.parameters.oxygen.optimal[0]));
    const minDOCritical = Math.max(...speciesList.map(s => s.parameters.oxygen.criticalLow));

    // For TAN ammonia, maximum allowed
    const maxTANOptimal = Math.min(...speciesList.map(s => s.parameters.ammonia.optimal[1]));
    const maxTANCritical = Math.min(...speciesList.map(s => s.parameters.ammonia.criticalHigh));

    // For pH
    const minPhOptimal = Math.max(...speciesList.map(s => s.parameters.ph.optimal[0]));
    const maxPhOptimal = Math.min(...speciesList.map(s => s.parameters.ph.optimal[1]));

    const checkParameter = (
      paramKey: 'oxygen' | 'ammonia' | 'ph' | 'temp',
      val: number,
      unit: string,
      isCritical: boolean,
      isWarning: boolean,
      refRange: [number, number],
      speciesImpact: string,
      action: string
    ) => {
      const activeSev = this.hysteresis.activeAlertSeverities[paramKey];

      if (isCritical || isWarning) {
        this.hysteresis.breachCounts[paramKey] = (this.hysteresis.breachCounts[paramKey] || 0) + 1;
        this.hysteresis.recoveryCounts[paramKey] = 0;

        // Require 2 consecutive breach points before triggering to avoid single-point spurious spikes
        if (this.hysteresis.breachCounts[paramKey] >= 2) {
          const targetSeverity = isCritical ? 'CRITICAL' : 'WARNING';
          if (activeSev !== targetSeverity) {
            this.hysteresis.activeAlertSeverities[paramKey] = targetSeverity;
            const alert: TelemetryAlert = {
              id: `ALT-${Date.now()}-${paramKey}`,
              pondId: this.pondId,
              parameter: paramKey,
              observedValue: val,
              unit,
              referenceRange: refRange,
              timestamp: new Date().toISOString(),
              severity: targetSeverity,
              ruleTriggered: `${paramKey.toUpperCase()}_HYSTERESIS_${targetSeverity}`,
              speciesImpactExplanation: speciesImpact,
              cautiousAction: action,
              isSimulated: true
            };
            storage.addAlert(alert);
          }
        }
      } else {
        // Condition is normal: requires 2 consecutive normal readings to clear alert (anti-chatter)
        this.hysteresis.recoveryCounts[paramKey] = (this.hysteresis.recoveryCounts[paramKey] || 0) + 1;
        if (this.hysteresis.recoveryCounts[paramKey] >= 2) {
          this.hysteresis.breachCounts[paramKey] = 0;
          this.hysteresis.activeAlertSeverities[paramKey] = null;
        }
      }
    };

    // Oxygen
    const doVal = this.currentMetrics.oxygen;
    checkParameter(
      'oxygen',
      doVal,
      'mg/L',
      doVal < minDOCritical,
      doVal < minDOOptimal,
      [minDOOptimal, 9.0],
      `Dissolved Oxygen (${doVal} mg/L) is below safe operating threshold for ${speciesList.map(s => s.commonName).join(', ')}. Risk of respiratory hypoxia and surfacing stress.`,
      'Activate mechanical paddlewheel aerators immediately and halt supplemental feeding.'
    );

    // Ammonia
    const tanVal = this.currentMetrics.ammonia;
    checkParameter(
      'ammonia',
      tanVal,
      'mg/L TAN',
      tanVal > maxTANCritical,
      tanVal > maxTANOptimal,
      [0.0, maxTANOptimal],
      `Total Ammonia Nitrogen (${tanVal} mg/L TAN) exceeds safe limit for ${speciesList.map(s => s.commonName).join(', ')}. Un-ionized fraction damages gills.`,
      'Suspend feeding immediately and perform a partial 20% water exchange with clean water.'
    );

    // pH
    const phVal = this.currentMetrics.ph;
    checkParameter(
      'ph',
      phVal,
      'pH',
      phVal < 6.0 || phVal > 9.5,
      phVal < minPhOptimal || phVal > maxPhOptimal,
      [minPhOptimal, maxPhOptimal],
      `Pond pH (${phVal}) drifted outside reference operating interval (${minPhOptimal}-${maxPhOptimal}). Affects gill osmoregulation.`,
      'Apply agricultural limestone (CaCO3) if acidic, or flush with fresh water if highly alkaline.'
    );
  }
}

export const simulationEngine = new SimulationEngine('POND-01');

