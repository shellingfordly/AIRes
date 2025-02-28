const express = require('express');
const router = express.Router();
const fs = require('fs');
const { BlogCrawler } = require('../core/BlogCrawler');
const defaultConfig = require('../configs/blogCrawler.Config');

let crawler;

router.post('/crawl', async (req, res) => {
	try {
		const config = { ...defaultConfig, ...req.body };
		const wss = req.app.get('wss'); // 获取 WebSocket 实例
		crawler = new BlogCrawler(config, wss); // 注入 WebSocket
		await crawler.crawl();
		res.json({ status: 'success', message: '爬取完成' });
	} catch (error) {
		res.status(500).json({ status: 'error', message: error.message });
	}
});

router.get('/results', (req, res) => {
	if (crawler) res.json(crawler.getResults());
});

module.exports = router;