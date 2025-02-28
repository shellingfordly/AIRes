const express = require('express');
const router = express.Router();
const { deepseek } = require('../core/deepseek');

router.post('/deepseek', async (req, res) => {
	try {
		const result = await deepseek(req.body.content);
		res.json({ status: 'success', message: result });
	} catch (error) {
		res.status(500).json({ status: 'error', message: error.message });
	}
});

module.exports = router;