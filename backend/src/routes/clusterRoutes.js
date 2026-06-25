const express = require('express');
const router = express.Router();
const clusterController = require('../controllers/clusterController');

router.get('/clusters', clusterController.getClusters);
router.get('/clusters/:id', clusterController.getClusterById);
router.get('/timeline', clusterController.getTimeline);

module.exports = router;
