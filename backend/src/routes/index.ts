import { Router } from 'express';
import speciesRoutes from './species.routes';
import diseaseRoutes from './disease.routes';
import simulationRoutes from './simulation.routes';
import userRoutes from './user.routes';
import analyticsRoutes from './analytics.routes';
import { speciesController } from '../controllers/species.controller';
import { diseaseController } from '../controllers/disease.controller';
import { simulationController } from '../controllers/simulation.controller';
import { userController } from '../controllers/user.controller';
import { analyticsController } from '../controllers/analytics.controller';

const router = Router();

// Sub-routers
router.use('/species', speciesRoutes);
router.use('/disease', diseaseRoutes);
router.use('/simulation', simulationRoutes);
router.use('/analytics', analyticsRoutes);

// Compatibility aliases matching existing frontend API client & test suite contracts
router.get('/diseases', diseaseController.getDiseases);
router.get('/diseases/:id', diseaseController.getDiseaseById);

router.get('/user', userController.getUser);
router.post('/user', userController.saveUser);

router.get('/ponds', userController.getPonds);
router.post('/ponds', userController.savePond);
router.get('/ponds/:id/telemetry', userController.getPondTelemetry);

router.get('/alerts', simulationController.getAlerts);
router.post('/alerts/:alertId/dismiss', simulationController.dismissAlert);

router.get('/telemetry/history/:pondId', simulationController.getHistory);

router.get('/datasets', analyticsController.getDatasets);
router.post('/datasets/evaluate', analyticsController.evaluateDataset);

export default router;
