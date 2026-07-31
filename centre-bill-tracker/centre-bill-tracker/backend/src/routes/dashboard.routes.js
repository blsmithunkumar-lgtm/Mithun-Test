const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// Admin + Operations both have dashboard access (SRD sections 2 and 4).
router.get('/summary', dashboardController.getSummary);
router.get('/latest-bills', dashboardController.getLatestBills);

module.exports = router;
