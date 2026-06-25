const express = require('express');
const router = express.Router();
const ingestController = require('../controllers/ingestController');

router.post('/trigger', ingestController.triggerIngestion);
router.get('/status/:jobId', ingestController.getJobStatus);

module.exports = router;
