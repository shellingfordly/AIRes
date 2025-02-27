// 默认配置
const BlogCrawlerDefaultConfig = {
	blogPageUrl: '',
	linkSuffix: 'page',
	linkSelector: 'a[href^="/blog/"]',
	excludePattern: '/page/',
	titleSelector: 'title',
	contentSelector: 'article',
	imageSelector: 'article img',
	retryAttempts: 2,
	maxExtraPages: 3,
};

module.exports = { BlogCrawlerDefaultConfig }