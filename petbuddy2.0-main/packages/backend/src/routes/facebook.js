import { Router } from 'express';
import {
  handleDataDeletion,
  dataDeletionStatus,
} from '../controllers/facebookDeletionController.js';

const router = Router();

router.post('/data-deletion', handleDataDeletion);
router.get('/data-deletion', handleDataDeletion);
router.get('/data-deletion-status', dataDeletionStatus);

export default router;
