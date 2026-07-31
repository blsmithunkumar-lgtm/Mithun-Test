const express = require('express');
const billController = require('../controllers/bill.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createBillSchema,
  updateBillSchema,
  updateBillStatusSchema,
  listBillsSchema,
} = require('../validators/bill.validator');

const router = express.Router();

router.use(authenticate);

// Admin + Operations: view bills, add bills.
router.get('/', validate(listBillsSchema), billController.listBills);
router.post('/', validate(createBillSchema), billController.createBill);

// Admin only: full field edit.
router.put('/:id', requireRole('Admin'), validate(updateBillSchema), billController.updateBill);

// Admin + Operations: update status, but the controller enforces the
// finer-grained rule that only Admin may set Received -> Paid.
router.patch('/:id/status', validate(updateBillStatusSchema), billController.updateBillStatus);

module.exports = router;
