import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from '../src/services/simulation.service';
import { storage } from '../src/services/storage.service';

describe('Pond Water Quality Simulation Engine', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine('TEST-POND');
    engine.reset(42);
    storage.clearAlerts();
  });

  it('initializes with reproducible seed and realistic parameters', () => {
    const state = engine.getState();
    expect(state.seed).toBe(42);
    expect(state.isSimulated).toBe(true);
    expect(state.currentMetrics.temp).toBeGreaterThanOrEqual(18);
    expect(state.currentMetrics.oxygen).toBeGreaterThanOrEqual(4);
    expect(state.currentMetrics.ph).toBeGreaterThanOrEqual(6.5);
  });

  it('supports start, pause, and reset controls', () => {
    engine.pause();
    expect(engine.getState().isRunning).toBe(false);

    engine.start();
    expect(engine.getState().isRunning).toBe(true);

    engine.reset(100);
    expect(engine.getState().seed).toBe(100);
    expect(engine.getState().stepCount).toBe(0);
  });

  it('generates a nocturnal hypoxia crisis scenario and alert with hysteresis', () => {
    engine.triggerScenario('NOCTURNAL_HYPOXIA');
    
    // Tick 4-6 times to drive DO down below threshold
    for (let i = 0; i < 7; i++) {
      engine.tick();
    }

    const state = engine.getState();
    expect(state.currentMetrics.oxygen).toBeLessThan(3.5);

    // Hysteresis alert should be triggered
    const alerts = storage.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    const doAlert = alerts.find(a => a.parameter === 'oxygen');
    expect(doAlert).toBeDefined();
    expect(['WARNING', 'CRITICAL']).toContain(doAlert?.severity);
    expect(doAlert?.speciesImpactExplanation).toContain('safe operating threshold');
    expect(doAlert?.cautiousAction).toContain('aerators');
  });

  it('demonstrates hypoxia recovery returning to baseline', () => {
    engine.triggerScenario('NOCTURNAL_HYPOXIA');
    // Tick 25 times through the complete crisis and aeration recovery cycle
    for (let i = 0; i < 25; i++) {
      engine.tick();
    }
    const state = engine.getState();
    expect(state.activeScenario).toBe('BASELINE');
    expect(state.currentMetrics.oxygen).toBeGreaterThanOrEqual(5.0);
  });
});
