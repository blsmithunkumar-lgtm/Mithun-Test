const express = require('express');
const multer = require('multer');
const phase2Controller = require('../controllers/phase2.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    // Let the controller return a consistent 400 response for unsupported MIME types.
    return callback(null, true);
  },
});

router.use(authenticate);
router.get('/bills/:id/breakdown', phase2Controller.getBreakdown);
router.put('/bills/:id/breakdown', phase2Controller.saveBreakdown);
router.get('/bills/:id/payments', phase2Controller.listPayments);
router.post('/bills/:id/payments', phase2Controller.createPayment);
router.get('/bills/:id/attachments', phase2Controller.listAttachments);
router.post('/bills/:id/attachments', upload.single('invoice'), phase2Controller.uploadAttachment);
router.get('/bills/:id/attachments/:attachmentId', phase2Controller.downloadAttachment);

module.exports = router;
