import { Router } from 'express';
import { userController } from '../controllers/user.controller';

const router = Router();

router.get('/profile', userController.getUser);
router.post('/profile', userController.saveUser);
router.get('/ponds', userController.getPonds);
router.post('/ponds', userController.savePond);

export default router;

