import { Router } from 'express';
import { receiveTelemetry, getTelemetryHistory } from '../controllers/telemetryController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', receiveTelemetry);
router.get('/history', authenticate, getTelemetryHistory);

export default router;
