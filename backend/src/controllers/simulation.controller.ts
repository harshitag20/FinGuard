import { Request, Response } from 'express';
import { simulationEngine } from '../services/simulation.service';
import { storage } from '../services/storage.service';

export const simulationController = {
  getState: (req: Request, res: Response) => {
    res.json({
      success: true,
      state: simulationEngine.getState()
    });
  },

  start: (req: Request, res: Response) => {
    simulationEngine.start();
    res.json({
      success: true,
      state: simulationEngine.getState()
    });
  },

  pause: (req: Request, res: Response) => {
    simulationEngine.pause();
    res.json({
      success: true,
      state: simulationEngine.getState()
    });
  },

  reset: (req: Request, res: Response) => {
    const seed = typeof req.body?.seed === 'number' ? req.body.seed : 42;
    simulationEngine.reset(seed);
    res.json({
      success: true,
      state: simulationEngine.getState()
    });
  },

  setSpeed: (req: Request, res: Response) => {
    const speed = typeof req.body?.speed === 'number' ? req.body.speed : 1;
    simulationEngine.setSpeed(speed);
    res.json({
      success: true,
      state: simulationEngine.getState()
    });
  },

  control: (req: Request, res: Response) => {
    const { action, speed } = req.body;
    if (action === 'start') {
      simulationEngine.start();
    } else if (action === 'stop' || action === 'pause') {
      simulationEngine.pause();
    } else if (action === 'reset') {
      simulationEngine.reset();
    }

    if (typeof speed === 'number') {
      simulationEngine.setSpeed(speed);
    }

    res.json({
      success: true,
      state: simulationEngine.getState()
    });
  },

  injectScenario: (req: Request, res: Response) => {
    const { scenario } = req.body;
    simulationEngine.triggerScenario(scenario);
    res.json({
      success: true,
      state: simulationEngine.getState()
    });
  },

  getHistory: (req: Request, res: Response) => {
    const pondId = (Array.isArray(req.params.pondId) ? req.params.pondId[0] : req.params.pondId) || 'POND-01';
    const history = storage.getTelemetry(pondId, 40);
    res.json({ success: true, history });
  },

  getAlerts: (req: Request, res: Response) => {
    const alerts = storage.getAlerts();
    res.json({ success: true, alerts });
  },

  clearAlerts: (req: Request, res: Response) => {
    storage.clearAlerts();
    res.json({ success: true, message: 'All alerts cleared.' });
  },

  dismissAlert: (req: Request, res: Response) => {
    const alertId = Array.isArray(req.params.alertId) ? req.params.alertId[0] : req.params.alertId;
    storage.dismissAlert(alertId);
    res.json({ success: true });
  }
};
