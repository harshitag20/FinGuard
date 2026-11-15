import { Request, Response } from 'express';
import { ALL_DISEASES_LIST, DISEASE_CATALOG } from '../../../shared/diseaseCatalog';
import { geminiScreeningService, ScreeningRequest, VerificationRequest } from '../services/geminiScreening.service';
import { storage } from '../services/storage.service';

export const diseaseController = {
  getDiseases: (req: Request, res: Response) => {
    res.json({
      success: true,
      count: ALL_DISEASES_LIST.length,
      diseases: ALL_DISEASES_LIST
    });
  },

  getDiseaseById: (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const disease = DISEASE_CATALOG[id];
    if (!disease) {
      return res.status(404).json({ success: false, error: `Disease '${id}' not found in catalogue.` });
    }
    res.json({ success: true, disease });
  },

  screen: async (req: Request, res: Response) => {
    try {
      const { speciesIds, pondId, pondMetrics, imageBase64, reportedSymptoms, symptomHistory } = req.body;

      if (!Array.isArray(speciesIds) || speciesIds.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one target species must be selected for species-aware screening.' });
      }

      const screeningReq: ScreeningRequest = {
        speciesIds,
        pondId: pondId || 'POND-01',
        pondMetrics,
        imageBase64,
        reportedSymptoms: Array.isArray(reportedSymptoms) ? reportedSymptoms : [],
        symptomHistory
      };

      const screeningResult = await geminiScreeningService.performScreening(screeningReq);
      (screeningResult as any).farm_id = req.body.farmId || req.body.farm_id || 'FARM-001';
      (screeningResult as any).pond_id = pondId || 'POND-01';
      storage.saveScreeningResult(screeningResult);

      res.json({ success: true, result: screeningResult });
    } catch (err: any) {
      console.error('[API] Disease screening error:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal screening error' });
    }
  },

  verify: (req: Request, res: Response) => {
    try {
      const {
        screeningId,
        repeatDO,
        repeatTemp,
        repeatPh,
        repeatAmmonia,
        gillClipExamined,
        gillClipNotes,
        microscopyConducted,
        expertConsulted,
        expertNameOrTitle
      } = req.body;

      const existing = storage.getScreeningResultById(screeningId);
      if (!existing) {
        return res.status(404).json({ success: false, error: `Screening report '${screeningId}' not found.` });
      }

      const verifyReq: VerificationRequest = {
        screeningId,
        repeatDO,
        repeatTemp,
        repeatPh,
        repeatAmmonia,
        gillClipExamined,
        gillClipNotes,
        microscopyConducted,
        expertConsulted,
        expertNameOrTitle
      };

      const updated = geminiScreeningService.verifyScreening(existing, verifyReq);
      storage.saveScreeningResult(updated);

      res.json({ success: true, result: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to verify screening' });
    }
  },

  getHistory: (req: Request, res: Response) => {
    const history = storage.getScreeningHistory();
    res.json({ success: true, history });
  }
};
