import { Router } from 'express';
import { MonitorController } from '../controllers/monitor.controller';
import { validate } from '../middlewares/validate.middleware';
import { createMonitorSchema, updateMonitorSchema, monitorQuerySchema } from '../validators/monitor.validator';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new MonitorController();

router.use(authenticate);

router.post('/', validate(createMonitorSchema), controller.create);
router.get('/', validate(monitorQuerySchema, 'query'), controller.findAll);
router.get('/:id', controller.findOne);
router.patch('/:id', validate(updateMonitorSchema), controller.update);
router.patch('/:id/enable', controller.enable);
router.patch('/:id/disable', controller.disable);
router.delete('/:id', controller.remove);
router.get('/:id/checks', controller.getChecks);
router.get('/:id/metrics', controller.getMetrics);

export default router;
