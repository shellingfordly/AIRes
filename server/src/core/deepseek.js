const OpenAI = require('openai');

console.log("process.env.DEEPSEEK_API_KEY", process.env.DEEPSEEK_API_KEY)

const openai = new OpenAI({
	baseURL: 'https://api.deepseek.com/v1',
	apiKey: process.env.DEEPSEEK_API_KEY || "sk-4265366e66244829b7e1d6fa3d005d66"
});

async function deepseek(content) {
	try {
		const completion = await openai.chat.completions.create({
			messages: [{ role: "system", content }],
			model: "deepseek-chat",
		});
		return completion.choices[0].message.content;
	} catch (error) {
		console.error("[error]: deepseek", error.message)
		throw new Error(error);
	}
}

module.exports = {
	deepseek
}
