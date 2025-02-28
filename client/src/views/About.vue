<script setup lang="ts">
const content = ref('');

const startCrawling = async () => {
	console.log("content", content.value)
	try {
		const response = await fetch('/api/deepseek', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content: content.value }),
		});
		if (!response.ok) throw new Error('爬取请求失败');
	} catch (error: any) {
	}
};

</script>

<template>
	<div class="container mx-auto">
		<form @submit.prevent="startCrawling" class="card bg-base-100 shadow-xl p-6 mb-8">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="form-control">
					<label class="label" for="content"><span class="label-text">内容</span></label>
					<input type="text" id="content" v-model="content"
						class="input input-bordered w-full" />
				</div>
			</div>
			<button type="submit" class="btn btn-primary mt-4 w-full">发送</button>
		</form>

	</div>
</template>