import { Router } from 'express';
import { simulationController } from '../controllers/simulation.controller';

const router = Router();

router.get('/state', simulationController.getState);
router.post('/control', simulationController.control);
router.post('/inject', simulationController.injectScenario);
router.get('/history', simulationController.getHistory);
router.get('/history/:pondId', simulationController.getHistory);
router.get('/alerts', simulationController.getAlerts);
router.post('/alerts/:alertId/dismiss', simulationController.dismissAlert);

export default router;
