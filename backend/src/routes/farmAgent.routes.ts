import { Router } from 'express';
import { farmAgentController } from '../controllers/farmAgent.controller';
import { observationController } from '../controllers/observation.controller';
import { authorizeFarmAccess } from '../middleware/farmAuth.middleware';

const router = Router();

// Top-level Farm Management (Registration & Listing)
router.get('/', farmAgentController.getFarms);
router.post('/', farmAgentController.registerFarm);

// Apply tenant authorization middleware across all farm-scoped routes
router.use('/:farmId', authorizeFarmAccess);

// 1. Client-Facing Farm Agent Messaging & Management
router.post('/:farmId/agent/message', farmAgentController.sendMessage);
router.post('/:farmId/message', farmAgentController.sendMessage);

router.get('/:farmId/agent/history', farmAgentController.getHistory);
router.get('/:farmId/conversations', farmAgentController.getHistory);

router.post('/:farmId/agent/research', farmAgentController.createResearch);
router.post('/:farmId/research', farmAgentController.createResearch);

router.get('/:farmId/agent/research/:taskId', farmAgentController.getResearchTask);
router.get('/:farmId/research/:taskId', farmAgentController.getResearchTask);

router.get('/:farmId/agent/status', farmAgentController.getStatus);
router.get('/:farmId/status', farmAgentController.getStatus);

// 2. Observation Ingestion (Outbox Sync from FarmAgent with Idempotency)
router.post('/:farmId/observations', observationController.ingestObservation);
router.get('/:farmId/observations', observationController.getObservations);

// 3. Central Authoritative Data-Providers (Read access for FarmAgent tools)
router.get('/:farmId/profile', farmAgentController.getCentralProfile);
router.get('/:farmId/diagnostics', farmAgentController.getCentralDiagnostics);
router.get('/:farmId/telemetry', farmAgentController.getCentralTelemetry);

export default router;
