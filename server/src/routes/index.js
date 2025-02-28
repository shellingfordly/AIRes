const express = require('express');
const router = express.Router();
const crawlerRouter = require('./crawler');

// 路由注册
router.use('/', crawlerRouter);

module.exports = router;