<script setup lang="ts">
const theme = ref(localStorage.getItem('theme') || 'light')

const toggleTheme = () => {
	theme.value = theme.value === 'light' ? 'dark' : 'light'
	localStorage.setItem('theme', theme.value)
	document.documentElement.setAttribute('data-theme', theme.value)
}

onMounted(() => {
	document.documentElement.setAttribute('data-theme', theme.value)
})
</script>

<template>
	<div class="min-h-screen bg-base-100">
		<!-- 头部 -->
		<Header @toggle-theme="toggleTheme" :current-theme="theme" />

		<div class="flex">
			<!-- 侧边栏 -->
			<Sidebar class="w-64 min-h-screen bg-base-200" />

			<!-- 主要内容区域 -->
			<main class="flex-1 p-4">
				<router-view></router-view>
			</main>
		</div>
	</div>
</template>
