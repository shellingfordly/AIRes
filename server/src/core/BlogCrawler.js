const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class BlogCrawler {
	constructor(config = {}, wss) {
		this.config = config;
		this.articles = [];
		this.allLinks = new Set();
		this.wss = wss; // WebSocket 服务器实例
	}

	// 推送实时消息到前端
	broadcast(message) {
		if (this.wss) {
			this.wss.clients.forEach(client => {
				if (client.readyState === client.OPEN) {
					client.send(JSON.stringify(message));
				}
			});
		}
	}

	async getBlogLinks(pageUrl, attempt = 0) {
		try {
			const response = await axios.get(pageUrl);
			const $ = cheerio.load(response.data);
			const links = [];

			let selector = this.config.linkSelector;
			if (!selector.includes('[') && !selector.includes('=')) {
				selector = `.${selector}`;
			}

			$(selector).each((i, element) => {
				const link = $(element).attr('href');
				if (link && link.startsWith('/') && !link.includes(this.config.excludePattern)) {
					const fullUrl = new URL(link, pageUrl).href;
					links.push(fullUrl);
				}
			});

			const limitedLinks = this.config.maxArticlesPerPage > 0
				? links.slice(0, this.config.maxArticlesPerPage)
				: links;

			// 推送实时链接
			this.broadcast({ type: 'links', page: pageUrl, links: limitedLinks });

			return [...new Set(limitedLinks)];
		} catch (error) {
			console.error(`获取链接失败: ${pageUrl} (尝试 ${attempt + 1}/${this.config.retryAttempts + 1})`, error.message);
			this.broadcast({ type: 'error', message: `获取链接失败: ${pageUrl}` });
			if (attempt < this.config.retryAttempts) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				return this.getBlogLinks(pageUrl, attempt + 1);
			}
			return [];
		}
	}

	// 清理标题的函数
	cleanTitle(rawTitle) {
		return rawTitle;
		// 移除常见分隔符及其后面的内容
		// let title = rawTitle.replace(/\s*[-|]\s*.+$/, '').trim();

		// // 定义常见无关关键词（可扩展）
		// const unwantedKeywords = [
		// 	'iconLinkedIn', 'iconGitHub', 'iconTwitter', 'iconFacebook',
		// 	'LinkedIn', 'GitHub', 'Twitter', 'Facebook', // 社交媒体名称
		// ];

		// // 分割标题并过滤关键词
		// const parts = title.split(/\s+/);
		// title = parts.filter(part => !unwantedKeywords.some(keyword => part.toLowerCase().includes(keyword.toLowerCase()))).join(' ');

		// 移除多余空格并返回
		// return title.trim();
	}

	// 清理内容并过滤空标签
	cleanContent($, elements, articleUrl) {
		const content = [];
		elements.each((i, element) => {
			const $el = $(element);
			const tagName = $el[0].tagName;
			let innerContent = '';

			// 处理 img 标签
			if (tagName === 'img') {
				const src = $el.attr('src');
				if (src) { // 只保留有 src 的 img
					const fullSrc = src.startsWith('http') ? src : new URL(src, articleUrl).href;
					innerContent = `<img src="${fullSrc}">`;
				}
			} else {
				// 处理其他标签，递归清理并检查内容
				innerContent = $el.contents().map((_, child) => {
					if (child.type === 'text') {
						const text = $(child).text().trim();
						return text ? text : '';
					}
					if (child.type === 'tag') {
						const childTag = child.tagName;
						if (childTag === 'img') {
							const src = $(child).attr('src');
							if (src) {
								const fullSrc = src.startsWith('http') ? src : new URL(src, articleUrl).href;
								return `<img src="${fullSrc}">`;
							}
							return '';
						}
						// 递归处理子节点，只有非空内容才保留
						const cleanedChild = $(child).contents().map((_, subChild) => {
							if (subChild.type === 'text') return $(subChild).text().trim();
							if (subChild.type === 'tag') return this.cleanContent($, $(subChild), articleUrl)[0] || '';
							return '';
						}).get().join('').trim();
						return cleanedChild ? `<${childTag}>${cleanedChild}</${childTag}>` : '';
					}
					return '';
				}).get().join('').trim();
			}

			// 只有非空内容才添加到结果
			if (innerContent) {
				const cleanHtml = `<${tagName}>${innerContent}</${tagName}>`;
				content.push(cleanHtml);
			}
		});
		return content;
	}

	async getArticleContent(articleUrl) {
		try {
			const response = await axios.get(articleUrl);
			const $ = cheerio.load(response.data);

			// title
			const rawTitle = $(this.config.titleSelector).text().trim();
			const title = this.cleanTitle(rawTitle);

			// content
			const contentElements = $(this.config.contentSelector).children();
			const content = this.cleanContent($, contentElements, articleUrl);

			// images
			const images = [];
			$(this.config.imageSelector).each((i, element) => {
				const src = $(element).attr('src');
				if (src) images.push(new URL(src, articleUrl).href);
			});

			const article = { url: articleUrl, title, content, images };
			// 推送实时文章内容
			this.broadcast({ type: 'article', data: article });

			return article;
		} catch (error) {
			console.error(`获取文章数据失败: ${articleUrl}`, error.message);
			this.broadcast({ type: 'error', message: `获取文章数据失败: ${articleUrl}` });
			return null;
		}
	}

	async crawl() {
		this.articles = [];
		this.allLinks.clear();
		let pageNum = 1;
		let emptyPageCount = 0;

		const effectiveMaxPages = this.config.maxPageNum === -1
			? this.config.maxExtraPages + 1
			: Math.min(this.config.maxPageNum, this.config.maxExtraPages + 1);

		while (pageNum <= effectiveMaxPages && emptyPageCount <= this.config.maxExtraPages) {
			const pageUrl = `${this.config.blogPageUrl.replace(/\/[^\/]*$/, '')}/${this.config.linkSuffix}/${pageNum}`;
			console.log(`尝试获取分页: ${pageUrl}`);
			this.broadcast({ type: 'status', message: `尝试获取分页: ${pageUrl}` });

			const links = await this.getBlogLinks(pageUrl);
			if (links.length > 0) {
				links.forEach(link => this.allLinks.add(link));
				emptyPageCount = 0;
				console.log(`分页 ${pageNum} 获取到 ${links.length} 个链接`);
			} else {
				emptyPageCount++;
				console.log(`分页 ${pageNum} 未获取到链接，剩余尝试次数: ${this.config.maxExtraPages - emptyPageCount}`);
				this.broadcast({ type: 'status', message: `分页 ${pageNum} 未获取到链接` });
			}

			pageNum++;
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		if (this.allLinks.size === 0) {
			console.log('未找到任何博客链接。');
			this.broadcast({ type: 'status', message: '未找到任何博客链接，爬取结束' });
			return;
		}

		console.log(`总计找到 ${this.allLinks.size} 个唯一链接`);
		this.broadcast({ type: 'status', message: `总计找到 ${this.allLinks.size} 个链接，开始爬取内容` });

		for (const link of this.allLinks) {
			const articleData = await this.getArticleContent(link);
			if (articleData) {
				this.articles.push(articleData);
				console.log(`成功爬取: ${link}`);
			} else {
				console.log(`跳过: ${link}`);
			}
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		fs.writeFileSync('datas/articles.json', JSON.stringify(this.articles, null, 2), 'utf-8');
		console.log('所有文章数据已保存到 datas/articles.json');
		this.broadcast({ type: 'complete', message: '爬取完成' });
	}

	getResults() {
		return this.articles;
	}
}

module.exports = { BlogCrawler };