import { Request, Response, NextFunction } from 'express';
import { storage } from '../services/storage.service';
import { config } from '../config';

/**
 * Validates that an internal service request carries the verified service key.
 */
export const requireServiceKey = (req: Request, res: Response, next: NextFunction): void => {
  const serviceKey = req.headers['x-finguard-service-key'] as string;
  if (!serviceKey || serviceKey !== config.farmAgentServiceKey) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing X-FinGuard-Service-Key.'
    });
    return;
  }
  next();
};

/**
 * Authorizes access to farm resources.
 * Allows access if:
 * 1) Request carries valid X-FinGuard-Service-Key (internal agent/service communication)
 * 2) Authenticated user is authorized to access the requested farm
 * Rejects with 403 Forbidden on tenant/isolation violations.
 */
export const authorizeFarmAccess = (req: Request, res: Response, next: NextFunction): void => {
  const farmId = (Array.isArray(req.params.farmId) ? req.params.farmId[0] : req.params.farmId) ||
                 (Array.isArray(req.body?.farm_id) ? req.body.farm_id[0] : req.body?.farm_id);

  if (!farmId) {
    res.status(400).json({ success: false, error: 'Target farm_id parameter is required.' });
    return;
  }

  // 1. Allow verified internal service requests
  const serviceKey = req.headers['x-finguard-service-key'] as string;
  if (serviceKey && serviceKey === config.farmAgentServiceKey) {
    return next();
  }

  // 2. Validate dynamic user-level farm authorization against central storage
  const user = storage.getUser();
  const authorizedFarms = new Set<string>(
    storage.getUserAuthorizedFarms(user?.id)
  );

  const normalizedRequested = farmId.trim().toUpperCase();
  const isAuthorized = authorizedFarms.has(normalizedRequested);

  if (!isAuthorized) {
    res.status(403).json({
      success: false,
      error: `Tenant Isolation Violation: User is not authorized to access farm '${farmId}'.`
    });
    return;
  }

  next();
};
