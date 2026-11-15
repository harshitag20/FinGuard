import { Request, Response } from 'express';
import { storage } from '../services/storage.service';

export const observationController = {
  /**
   * Ingests a farmer observation with idempotency guarantee.
   * Specification matches Section 4 & EXPRESS_INTEGRATION_CONTRACT.md:
   * POST /api/v1/farms/:farmId/observations
   */
  ingestObservation: (req: Request, res: Response) => {
    const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
    const body = req.body;

    if (!body || !body.description) {
      return res.status(400).json({
        success: false,
        error: "Payload validation failed: 'description' is required."
      });
    }

    // Tenant isolation verification: path farmId must match body farm_id if present
    if (body.farm_id && body.farm_id.trim() !== farmId.trim()) {
      return res.status(403).json({
        success: false,
        error: `Tenant Authorization Violation: Body farm_id '${body.farm_id}' does not match URL farmId '${farmId}'.`
      });
    }

    const idempotencyKey = (req.headers['idempotency-key'] as string) ||
                           body.idempotency_key ||
                           body.observation_id ||
                           `IDEM-${Date.now()}`;

    const observationPayload = {
      ...body,
      farm_id: farmId
    };

    const { record, isDuplicate } = storage.saveObservation(observationPayload, idempotencyKey);

    if (isDuplicate) {
      // Return 409 or 200 with duplicate flag indicating safe idempotent replay
      return res.status(409).json({
        success: true,
        central_id: record.central_id,
        committed_at: record.committed_at,
        duplicate: true
      });
    }

    return res.status(201).json({
      success: true,
      central_id: record.central_id,
      committed_at: record.committed_at
    });
  },

  /**
   * Retrieves central observations for an authorized farm.
   */
  getObservations: (req: Request, res: Response) => {
    const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId);
    const observations = storage.getObservations(farmId);
    res.json({
      success: true,
      farm_id: farmId,
      count: observations.length,
      observations
    });
  }
};
