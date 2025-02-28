// 默认配置
const BlogCrawlerDefaultConfig = {
	blogPageUrl: 'https://humanloop.com/blog/',
	linkSuffix: 'page',
	linkSelector: 'a[href^="/blog/"]',
	excludePattern: '/page/',
	titleSelector: 'title',
	contentSelector: 'article',
	imageSelector: 'article img',
	retryAttempts: 2,
	maxExtraPages: 3,
	maxPageNum: -1,
	maxArticlesPerPage: -1,
};

module.exports = BlogCrawlerDefaultConfig