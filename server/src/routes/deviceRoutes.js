import { Router } from 'express';
import { getDevices, getRunningDevices, toggleDevice, bulkToggleDevices } from '../controllers/deviceController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getDevices);
router.get('/running', authenticate, getRunningDevices);
router.post('/bulk', authenticate, bulkToggleDevices);
router.post('/:id/toggle', authenticate, toggleDevice);

export default router;
