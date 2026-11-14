import { Request, Response } from 'express';
import { storage } from '../services/storage.service';

export const userController = {
  getUser: (req: Request, res: Response) => {
    const user = storage.getUser();
    res.json({ success: true, user });
  },

  saveUser: (req: Request, res: Response) => {
    const user = req.body;
    if (!user || !user.name) {
      return res.status(400).json({ success: false, error: 'Farmer profile data required' });
    }
    storage.saveUser(user);
    res.json({ success: true, user });
  },

  getPonds: (req: Request, res: Response) => {
    const ponds = storage.getPonds();
    res.json({ success: true, ponds });
  },

  savePond: (req: Request, res: Response) => {
    const pond = req.body;
    if (!pond || !pond.id) {
      return res.status(400).json({ success: false, error: 'Pond configuration required' });
    }
    storage.savePond(pond);
    res.json({ success: true, pond });
  },

  getPondTelemetry: (req: Request, res: Response) => {
    const pondId = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const records = storage.getTelemetry(pondId, 40);
    res.json({ success: true, telemetry: records });
  }
};
