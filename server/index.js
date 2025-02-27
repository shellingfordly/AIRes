const fs = require('fs');
const http = require('http');
const path = require('path');
const { BlogCrawler } = require('./src/core/BlogCrawler');

// 创建全局爬虫实例
let crawler = new BlogCrawler();

// HTTP 服务器
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    // 返回 index.html
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('服务器错误');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.method === 'POST' && req.url === '/crawl') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const config = JSON.parse(body);
        crawler = new BlogCrawler(config); // 重置爬虫实例
        await crawler.crawl();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: '爬取完成' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: error.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/results') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(crawler.getResults()));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: '接口不存在' }));
  }
});

// 启动服务器
server.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});