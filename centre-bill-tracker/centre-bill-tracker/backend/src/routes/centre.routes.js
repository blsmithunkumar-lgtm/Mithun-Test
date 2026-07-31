const express = require('express');
const centreController = require('../controllers/centre.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createCentreSchema,
  updateCentreSchema,
  updateStatusSchema,
  deleteCentreSchema,
  listCentresSchema,
} = require('../validators/centre.validator');

const router = express.Router();

router.use(authenticate);

// Admin + Operations can view centres (Operations needs this to pick a
// centre when adding a bill).
router.get('/', validate(listCentresSchema), centreController.listCentres);

// Admin-only management actions.
router.post('/', requireRole('Admin'), validate(createCentreSchema), centreController.createCentre);
router.put('/:id', requireRole('Admin'), validate(updateCentreSchema), centreController.updateCentre);
router.patch(
  '/:id/status',
  requireRole('Admin'),
  validate(updateStatusSchema),
  centreController.updateCentreStatus,
);
router.delete('/:id', requireRole('Admin'), validate(deleteCentreSchema), centreController.deleteCentre);

module.exports = router;
