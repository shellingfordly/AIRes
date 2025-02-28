const express = require('express');
const path = require('path');
const router = express.Router();
const crawlerRouter = require('./crawler');
const deepseekRouter = require('./deepseek');


router.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '../../client/index.html'));
});

router.use('/', crawlerRouter);
router.use('/', deepseekRouter);

module.exports = router;
