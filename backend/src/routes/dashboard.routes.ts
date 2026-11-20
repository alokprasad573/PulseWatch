import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new DashboardController();

router.use(authenticate);

router.get('/summary', controller.getSummary);
router.get('/', controller.getSummary);

export default router;
