import { Router } from 'express';
import { getAlerts, triggerDemoSpike } from '../controllers/alertController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getAlerts);
router.post('/test-spike', authenticate, triggerDemoSpike);

export default router;
