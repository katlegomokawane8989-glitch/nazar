const { GoatBotApis } = global.utils;

module.exports = {
	config: {
		name: "texttoimage",
		aliases: ["midjourney", "openjourney", "text2image"],
		version: "1.3",
		author: "NZR",
		countDown: 5,
		role: 0,
		description: {
			uid: "Tạo ảnh từ văn bản của bạn",
			en: "Create image from your text"
		},
		category: "info",
		guide: {
			vi: "   {pn} <prompt>: tạo ảnh từ văn bản của bạn"
				+ "\n    Ví dụ: {pn} create a realistic house, 4k, cinematic lighting",
			en: "   {pn} <prompt>: create an image from your text"
				+ "\n    Example: {pn} create a realistic house, 4k, cinematic lighting"
		}
	},

	langs: {
		vi: {
			syntaxError: "⚠️ Vui lòng nhập prompt",
			error: "❗ Đã có lỗi xảy ra, vui lòng thử lại sau:\n%1",
			serverError: "❗ Server đang quá tải, vui lòng thử lại sau",
			missingGoatApiKey: "❗ Chưa cài đặt apikey cho GoatBot. Hãy kiểm tra configCommands.json > envGlobal.goatbotApikey."
		},
		en: {
			syntaxError: "⚠️ Please enter a prompt.",
			error: "❗ An error occurred. Please try again later:\n%1",
			serverError: "❗ The image server is busy. Please try again later.",
			missingGoatApiKey: "❗ GoatBot API key is missing. Set envGlobal.goatbotApikey in configCommands.json."
		}
	},

	onStart: async function ({ message, args, getLang, envGlobal }) {
		const prompt = args.join(" ").trim();

		if (!prompt)
			return message.reply(getLang("syntaxError"));

		try {
			const apiKey = envGlobal?.goatbotApikey;

			if (!apiKey)
				return message.reply(getLang("missingGoatApiKey"));

			if (typeof GoatBotApis !== "function")
				throw new Error("GoatBotApis is unavailable. Check your GoatBot version.");

			const goatBotApi = new GoatBotApis(apiKey);

			if (!goatBotApi.isSetApiKey())
				return message.reply(getLang("missingGoatApiKey"));

			const response = await goatBotApi.api({
				url: "/image/mdjrny",
				method: "GET",
				params: {
					prompt,
					style_id: 28,
					aspect_ratio: "1:1"
				},
				responseType: "stream"
			});

			const imageStream = response?.data;

			if (!imageStream)
				throw new Error("The image API returned no image.");

			imageStream.path = "image.jpg";

			return message.reply({
				attachment: imageStream
			});
		}
		catch (err) {
			const details =
				err?.response?.data?.message ||
				err?.data?.message ||
				err?.message ||
				"Unknown error";

			console.error("[texttoimage]", err);

			return message.reply(getLang("error", details));
		}
	}
};