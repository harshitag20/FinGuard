import { Router } from 'express';
import { speciesController } from '../controllers/species.controller';

const router = Router();

router.get('/', speciesController.getSpecies);
router.get('/:id', speciesController.getSpeciesById);
router.post('/overlap', speciesController.evaluateOverlap);

export default router;

