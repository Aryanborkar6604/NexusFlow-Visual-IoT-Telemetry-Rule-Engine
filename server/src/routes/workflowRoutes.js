import { Router } from 'express';
import {
  getWorkflows,
  getWorkflowById,
  saveWorkflow,
  toggleWorkflow,
  deleteWorkflow,
} from '../controllers/workflowController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticate, getWorkflows);
router.get('/:id', authenticate, getWorkflowById);
router.post('/', authenticate, saveWorkflow);
router.put('/:id', authenticate, saveWorkflow);
router.post('/:id/toggle', authenticate, toggleWorkflow);
router.delete('/:id', authenticate, deleteWorkflow);

export default router;
