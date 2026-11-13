import { Router } from 'express';
import { getDevices } from '../controllers/deviceController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getDevices);

export default router;
