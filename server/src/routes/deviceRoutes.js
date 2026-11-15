import { Router } from 'express';
import { getDevices, toggleDevice } from '../controllers/deviceController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getDevices);
router.post('/:id/toggle', authenticate, toggleDevice);

export default router;
