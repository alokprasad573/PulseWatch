import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();
const controller = new HealthController();

router.get('/health', controller.getHealth);
router.get('/ready', controller.getReady);

export default router;
