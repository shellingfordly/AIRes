const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { BlogCrawlerDefaultConfig } = require('../configs/BlogCrawler.Config');

class BlogCrawler {
	constructor(config = {}) {
		this.config = { ...BlogCrawlerDefaultConfig, ...config };
		this.articles = []; // 存储爬取结果
		this.allLinks = new Set();
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
			return [...new Set(links)];
		} catch (error) {
			console.error(`获取链接失败: ${pageUrl} (尝试 ${attempt + 1}/${this.config.retryAttempts + 1})`, error.message);
			if (attempt < this.config.retryAttempts) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				return this.getBlogLinks(pageUrl, attempt + 1);
			}
			return [];
		}
	}

	async getArticleContent(articleUrl) {
		try {
			const response = await axios.get(articleUrl);
			const $ = cheerio.load(response.data);

			const title = $(this.config.titleSelector).text().trim();
			const content = [];
			$(this.config.contentSelector).children().each((i, element) => {
				const html = $.html(element).trim();
				if (html) content.push(html);
			});
			const images = [];
			$(this.config.imageSelector).each((i, element) => {
				const src = $(element).attr('src');
				if (src) images.push(new URL(src, articleUrl).href);
			});

			return { title, content, images };
		} catch (error) {
			console.error(`获取文章数据失败: ${articleUrl}`, error.message);
			return null;
		}
	}

	async crawl() {
		this.articles = [];
		this.allLinks.clear();
		let pageNum = 1;
		let emptyPageCount = 0;

		while (emptyPageCount <= this.config.maxExtraPages) {
			const pageUrl = pageNum === 1 ? this.config.blogPageUrl : `${this.config.blogPageUrl.replace(/\/[^\/]*$/, '')}/${this.config.linkSuffix}/${pageNum}`;
			console.log(`尝试获取分页: ${pageUrl}`);

			const links = await this.getBlogLinks(pageUrl);
			if (links.length > 0) {
				links.forEach(link => this.allLinks.add(link));
				emptyPageCount = 0;
				console.log(`分页 ${pageNum} 获取到 ${links.length} 个链接`);
			} else {
				emptyPageCount++;
				console.log(`分页 ${pageNum} 未获取到链接，剩余尝试次数: ${this.config.maxExtraPages - emptyPageCount}`);
			}

			pageNum++;
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		if (this.allLinks.size === 0) {
			console.log('未找到任何博客链接。');
			return;
		}

		console.log(`总计找到 ${this.allLinks.size} 个唯一链接：`, Array.from(this.allLinks));

		for (const link of this.allLinks) {
			const articleData = await this.getArticleContent(link);
			if (articleData) {
				this.articles.push({
					url: link,
					title: articleData.title,
					content: articleData.content,
					images: articleData.images,
				});
				console.log(`成功爬取: ${link}`);
			} else {
				console.log(`跳过: ${link}`);
			}
			await new Promise(resolve => setTimeout(resolve, 1000));
		}

		fs.writeFileSync('articles.json', JSON.stringify(this.articles, null, 2), 'utf-8');
		console.log('所有文章数据已保存到 articles.json');
	}

	getResults() {
		return this.articles;
	}
}


module.exports = {
	BlogCrawler
}
