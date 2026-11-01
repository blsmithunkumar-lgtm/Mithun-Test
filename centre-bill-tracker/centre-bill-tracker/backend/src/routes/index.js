const express = require('express');
const authRoutes = require('./auth.routes');
const centreRoutes = require('./centre.routes');
const billRoutes = require('./bill.routes');
const dashboardRoutes = require('./dashboard.routes');
const phase2Routes = require('./phase2.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/centres', centreRoutes);
router.use('/bills', billRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/phase2', phase2Routes);

module.exports = router;
