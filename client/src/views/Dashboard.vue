<template>
	<div class="container mx-auto">
		<form @submit.prevent="startCrawling" class="card bg-base-100 shadow-xl p-6 mb-8">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="form-control">
					<label class="label" for="blogPageUrl"><span class="label-text">博客页面 URL</span></label>
					<input type="text" id="blogPageUrl" v-model="config.blogPageUrl"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="linkSuffix"><span class="label-text">链接后缀 (如 page)</span></label>
					<input type="text" id="linkSuffix" v-model="config.linkSuffix"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="linkSelector"><span class="label-text">链接选择器</span></label>
					<input type="text" id="linkSelector" v-model="config.linkSelector"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="excludePattern"><span class="label-text">排除模式</span></label>
					<input type="text" id="excludePattern" v-model="config.excludePattern"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="titleSelector"><span class="label-text">标题选择器</span></label>
					<input type="text" id="titleSelector" v-model="config.titleSelector"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="contentSelector"><span class="label-text">内容选择器</span></label>
					<input type="text" id="contentSelector" v-model="config.contentSelector"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="imageSelector"><span class="label-text">图片选择器</span></label>
					<input type="text" id="imageSelector" v-model="config.imageSelector"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="retryAttempts"><span class="label-text">重试次数</span></label>
					<input type="number" id="retryAttempts" v-model="config.retryAttempts"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="maxExtraPages"><span class="label-text">最大额外分页</span></label>
					<input type="number" id="maxExtraPages" v-model="config.maxExtraPages"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="maxPageNum"><span class="label-text">最大爬取页数 (-1 为无限制)</span></label>
					<input type="number" id="maxPageNum" v-model="config.maxPageNum"
						class="input input-bordered w-full" />
				</div>
				<div class="form-control">
					<label class="label" for="maxArticlesPerPage"><span class="label-text">每页最大文章数 (-1
							为无限制)</span></label>
					<input type="number" id="maxArticlesPerPage" v-model="config.maxArticlesPerPage"
						class="input input-bordered w-full" />
				</div>
			</div>
			<button type="submit" class="btn btn-primary mt-4 w-full">开始爬取</button>
		</form>

		<h2 class="text-2xl font-bold text-center mb-4">爬取日志</h2>
		<div ref="logDiv" class="card bg-base-200 p-4 mb-8 log-container">
			<p v-for="(log, index) in logs" :key="index" :class="log.class">{{ log.text }}</p>
		</div>

		<h2 class="text-2xl font-bold text-center mb-4">爬取结果</h2>
		<button @click="refreshResults" class="btn btn-secondary mb-4">刷新结果</button>
		<div class="space-y-4">
			<div v-for="(article, index) in articles" :key="index" class="card bg-base-100 shadow-xl article">
				<div class="card-body">
					<h3 class="card-title">{{ article.title }}</h3>
					<p><strong>URL:</strong> <a :href="article.url" target="_blank" class="link link-primary">{{
						article.url }}</a></p>
					<div v-html="article.content"> </div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

// 定义配置类型
interface CrawlerConfig {
	blogPageUrl: string;
	linkSuffix: string;
	linkSelector: string;
	excludePattern: string;
	titleSelector: string;
	contentSelector: string;
	imageSelector: string;
	retryAttempts: number;
	maxExtraPages: number;
	maxPageNum: number;
	maxArticlesPerPage: number;
}

interface Article {
	url: string;
	title: string;
	content: string[];
	images: string[];
}

interface LogEntry {
	text: string;
	class: string;
}

// 状态管理
const config = ref<CrawlerConfig>({
	blogPageUrl: 'https://humanloop.com/blog/',
	linkSuffix: 'page',
	linkSelector: "a[href^='/blog/']",
	excludePattern: '/page/',
	titleSelector: 'h1',
	contentSelector: 'article',
	imageSelector: 'article img',
	retryAttempts: 2,
	maxExtraPages: 3,
	maxPageNum: -1,
	maxArticlesPerPage: -1,
});
const logs = ref<LogEntry[]>([]);
const articles = ref<Article[]>([]);
const logDiv = ref<HTMLElement | null>(null);

// 封装接口请求
const fetchResults = async (): Promise<Article[]> => {
	const response = await fetch('/api/results');
	if (!response.ok) throw new Error('获取结果失败');
	return response.json();
};

const startCrawlingRequest = async (config: CrawlerConfig) => {
	const response = await fetch('/api/crawl', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(config),
	});
	if (!response.ok) throw new Error('爬取请求失败');
	return response.json();
};

// 封装 WebSocket
const initWebSocket = () => {
	const ws = new WebSocket('/ws');
	ws.onopen = () => console.log('WebSocket 已连接');
	ws.onmessage = (event) => {
		const data = JSON.parse(event.data);
		handleWebSocketMessage(data);
	};
	ws.onclose = () => console.log('WebSocket 已断开');
	return ws;
};

// 处理 WebSocket 消息
const handleWebSocketMessage = (data: any) => {
	switch (data.type) {
		case 'status':
			logs.value.push({ text: data.message, class: 'text-sm' });
			break;
		case 'links':
			logs.value.push({ text: `${data.page} 获取到 ${data.links.length} 个链接`, class: 'text-sm text-blue-600' });
			break;
		case 'article':
			articles.value.push(data.data);
			break;
		case 'error':
			logs.value.push({ text: data.message, class: 'text-sm text-red-600' });
			break;
		case 'complete':
			logs.value.push({ text: data.message, class: 'text-sm text-green-600' });
			break;
	}
	nextTick(() => {
		if (logDiv.value) logDiv.value.scrollTop = logDiv.value.scrollHeight;
	});
};

// 刷新结果
const refreshResults = async () => {
	try {
		articles.value = await fetchResults();
	} catch (error: any) {
		logs.value.push({ text: `加载结果失败: ${error.message}`, class: 'text-sm text-red-600' });
	}
};

// 启动爬取
const startCrawling = async () => {
	try {
		const result = await startCrawlingRequest(config.value);
		logs.value.push({ text: result.message, class: 'text-sm text-green-600' });
	} catch (error: any) {
		logs.value.push({ text: `爬取失败: ${error.message}`, class: 'text-sm text-red-600' });
	}
};

// 初始化
onMounted(() => {
	initWebSocket();
	refreshResults();
});
</script>

<style scoped>
.log-container {
	max-height: 200px;
	overflow-y: auto;
}
</style>