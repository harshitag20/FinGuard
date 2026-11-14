import { Router } from 'express';
import { diseaseController } from '../controllers/disease.controller';

const router = Router();

router.get('/', diseaseController.getDiseases);
router.get('/history', diseaseController.getHistory);
router.get('/:id', diseaseController.getDiseaseById);
router.post('/screen', diseaseController.screen);
router.post('/verify', diseaseController.verify);

export default router;

