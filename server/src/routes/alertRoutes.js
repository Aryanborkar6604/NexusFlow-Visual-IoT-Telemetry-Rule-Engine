
import { Router } from 'express';

import {
  getAlerts,
  triggerDemoSpike,
} from '../controllers/alertController.js';

import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Get alerts
router.get('/', authenticate, getAlerts);

// Trigger a simulated temperature spike
router.post('/test-spike', authenticate, triggerDemoSpike);

export default router;
