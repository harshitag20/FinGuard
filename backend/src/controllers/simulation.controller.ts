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

  control: (req: Request, res: Response) => {
    const { action, speed } = req.body;
    if (action === 'start') {
      simulationEngine.start();
    } else if (action === 'stop' || action === 'pause') {
      simulationEngine.pause();
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

  dismissAlert: (req: Request, res: Response) => {
    const alertId = Array.isArray(req.params.alertId) ? req.params.alertId[0] : req.params.alertId;
    storage.dismissAlert(alertId);
    res.json({ success: true });
  }
};
