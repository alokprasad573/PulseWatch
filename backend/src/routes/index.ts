import { Router } from 'express';
import authRoutes from './auth.routes';
import monitorRoutes from './monitor.routes';
import incidentRoutes from './incident.routes';
import dashboardRoutes from './dashboard.routes';
import healthRoutes from './health.routes';

const router = Router();

// Domain API routes
router.use('/auth', authRoutes);
router.use('/monitors', monitorRoutes);
router.use('/incidents', incidentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/health', healthRoutes);

export default router;
