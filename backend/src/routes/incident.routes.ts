import { Router } from 'express';
import { IncidentController } from '../controllers/incident.controller';
import { validate } from '../middlewares/validate.middleware';
import { incidentQuerySchema, updateIncidentSchema } from '../validators/incident.validator';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const controller = new IncidentController();

router.use(authenticate);

router.get('/', validate(incidentQuerySchema, 'query'), controller.findAll);
router.get('/:id', controller.findOne);
router.patch('/:id', validate(updateIncidentSchema), controller.update);

export default router;
