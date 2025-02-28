const express = require('express');
const { WebSocketServer } = require('ws');
const router = require('./src/routes/index');

const app = express();

// 中间件：解析 JSON 请求体
app.use(express.json());

// 注册路由
app.use('/', router);

// 启动 HTTP 服务器
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ server });

// WebSocket 连接管理
wss.on('connection', (ws) => {
  console.log('WebSocket 客户端已连接');
  ws.on('close', () => console.log('WebSocket 客户端已断开'));
});

// 提供方法供 BlogCrawler 推送实时数据
app.set('wss', wss);

module.exports = app; // 导出 app 以便在路由中使用