import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/datasets', analyticsController.getDatasets);
router.post('/datasets/evaluate', analyticsController.evaluateDataset);

export default router;

