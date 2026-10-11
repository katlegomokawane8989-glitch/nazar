const axios = require("axios");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");
const { getStreamFromURL, formatNumber } = global.utils;

const TEMP_DIR = path.join(__dirname, "tmp");
const MAX_VIDEO_SIZE = 83 * 1024 * 1024;
const MAX_AUDIO_SIZE = 26 * 1024 * 1024;

async function getStreamAndSize(url) {
const response = await axios({
method: "GET",
url,
responseType: "stream",
maxRedirects: 5,
timeout: 60000,
headers: {
"User-Agent": "Mozilla/5.0"
}
});

return {
	stream: response.data,
	size: Number(response.headers["content-length"]) || 0
};

}

module.exports = {
config: {
name: "ytb",
version: "1.17",
author: "NTKhang",
countDown: 5,
role: 0,
description: {
vi: "Tải video, audio hoặc xem thông tin video trên YouTube",
en: "Download video, audio or view video information on YouTube"
},
category: "media",
guide: {
en: "{pn} -v <video name or link>\n{pn} -a <video name or link>\n{pn} -i <video name or link>"
}
},

langs: {
	en: {
		error: "❌ An error occurred: %1",
		noResult: "⭕ No search results found for: %1",
		choose: "Reply with a number to select a video, or anything else to cancel.\n\n%1",
		video: "video",
		audio: "audio",
		downloading: "⬇️ Downloading %1: %2",
		noVideo: "⭕ No suitable video under 83 MB was found.",
		noAudio: "⭕ No suitable audio under 26 MB was found.",
		info: "💠 Title: %1\n🏪 Channel: %2\n👥 Subscribers: %3\n⏱ Duration: %4\n👀 Views: %5\n👍 Likes: %6\n🆙 Uploaded: %7\n🔠 ID: %8\n🔗 Link: %9"
	},
	vi: {
		error: "❌ Đã xảy ra lỗi: %1",
		noResult: "⭕ Không tìm thấy video: %1",
		choose: "Trả lời bằng số để chọn video, hoặc nội dung khác để hủy.\n\n%1",
		video: "video",
		audio: "âm thanh",
		downloading: "⬇️ Đang tải %1: %2",
		noVideo: "⭕ Không tìm thấy video phù hợp dưới 83 MB.",
		noAudio: "⭕ Không tìm thấy audio phù hợp dưới 26 MB.",
		info: "💠 Tiêu đề: %1\n🏪 Kênh: %2\n👥 Người đăng ký: %3\n⏱ Thời lượng: %4\n👀 Lượt xem: %5\n👍 Lượt thích: %6\n🆙 Ngày tải: %7\n🔠 ID: %8\n🔗 Link: %9"
	}
},

onStart: async function ({ args, message, event, commandName, getLang }) {
	const mode = {
		"-v": "video",
		"video": "video",
		"-a": "audio",
		"-s": "audio",
		"audio": "audio",
		"sing": "audio",
		"-i": "info",
		"info": "info"
	}[String(args[0] || "").toLowerCase()];

	if (!mode || !args.slice(1).length) {
		return message.reply(
			"Usage:\n-ytb -v <name or link>\n-ytb -a <name or link>\n-ytb -i <name or link>"
		);
	}

	const query = args.slice(1).join(" ").trim();
	const videoID = extractVideoID(query);

	try {
		if (videoID) {
			const infoVideo = await getVideoInfo(videoID);
			return handle({ type: mode, infoVideo, message, getLang });
		}

		const results = (await search(query)).slice(0, 6);

		if (!results.length) {
			return message.reply(getLang("noResult", query));
		}

		const attachments = await Promise.all(
			results.map(async item => {
				try {
					return await getStreamFromURL(item.thumbnail);
				} catch (_) {
					return null;
				}
			})
		);

		const validAttachments = attachments.filter(Boolean);
		const body = results.map((item, i) =>
			`${i + 1}. ${item.title}\nDuration: ${item.time}\nChannel: ${item.channel.name}`
		).join("\n\n");

		return message.reply({
			body: getLang("choose", body),
			attachment: validAttachments
		}, (err, info) => {
			if (err || !info?.messageID) return;

			global.GoatBot.onReply.set(info.messageID, {
				commandName,
				messageID: info.messageID,
				author: event.senderID,
				result: results,
				type: mode
			});
		});
	} catch (error) {
		console.error("[YTB SEARCH]", error);
		return message.reply(getLang("error", error.message));
	}
},

onReply: async function ({ event, api, Reply, message, getLang }) {
	if (String(event.senderID) !== String(Reply.author)) {
		return;
	}

	const choice = String(event.body || "").trim();

	if (!/^[1-6]$/.test(choice)) {
		global.GoatBot.onReply.delete(Reply.messageID);
		return api.unsendMessage(Reply.messageID);
	}

	const selected = Reply.result[Number(choice) - 1];

	if (!selected) {
		return message.reply("❌ Invalid selection.");
	}

	global.GoatBot.onReply.delete(Reply.messageID);
	api.unsendMessage(Reply.messageID);

	try {
		const infoVideo = await getVideoInfo(selected.id);
		return handle({
			type: Reply.type,
			infoVideo,
			message,
			getLang
		});
	} catch (error) {
		console.error("[YTB REPLY]", error);
		return message.reply(getLang("error", error.message));
	}
}

};

async function handle({ type, infoVideo, message, getLang }) {
const { title, videoId } = infoVideo;
await fs.ensureDir(TEMP_DIR);

if (type === "info") {
	const duration = Number(infoVideo.lengthSeconds) || 0;
	const hours = Math.floor(duration / 3600);
	const minutes = Math.floor((duration % 3600) / 60);
	const seconds = duration % 60;
	const time = hours
		? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
		: `${minutes}:${String(seconds).padStart(2, "0")}`;

	const text = getLang(
		"info",
		title,
		infoVideo.channel.name || infoVideo.author || "Unknown",
		formatNumber(infoVideo.channel.subscriberCount || 0),
		time,
		formatNumber(Number(infoVideo.viewCount) || 0),
		formatNumber(Number(infoVideo.likes) || 0),
		infoVideo.uploadDate || "Unknown",
		videoId,
		`https://youtu.be/${videoId}`
	);

	const attachments = [];

	for (const url of [
		infoVideo.thumbnails?.at(-1)?.url,
		infoVideo.channel.thumbnails?.at(-1)?.url
	]) {
		if (!url) continue;

		try {
			attachments.push(await getStreamFromURL(url));
		} catch (_) {}
	}

	return message.reply({
		body: text,
		attachment: attachments
	});
}

const isVideo = type === "video";
const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_AUDIO_SIZE;
const label = getLang(isVideo ? "video" : "audio");
const status = await message.reply(getLang("downloading", label, title));

const savePath = path.join(
	TEMP_DIR,
	`${videoId}_${Date.now()}.${isVideo ? "mp4" : "mp3"}`
);

try {
	const info = await ytdl.getInfo(videoId);

	let formats = info.formats.filter(format => {
		if (!format.url || !format.contentLength) return false;

		const size = Number(format.contentLength);

		if (size <= 0 || size > maxSize) return false;

		if (isVideo) {
			return format.hasVideo && format.hasAudio;
		}

		return format.hasAudio && !format.hasVideo;
	});

	if (isVideo) {
		formats.sort((a, b) =>
			(Number(b.height) || 0) - (Number(a.height) || 0)
		);
	} else {
		formats.sort((a, b) =>
			(Number(b.audioBitrate) || 0) - (Number(a.audioBitrate) || 0)
		);
	}

	const format = formats[0];

	if (!format) {
		return message.reply(
			getLang(isVideo ? "noVideo" : "noAudio")
		);
	}

	const download = await getStreamAndSize(format.url);

	if (download.size > maxSize) {
		download.stream.destroy();
		return message.reply(
			getLang(isVideo ? "noVideo" : "noAudio")
		);
	}

	await pipeline(download.stream, fs.createWriteStream(savePath));

	const actualSize = (await fs.stat(savePath)).size;

	if (!actualSize || actualSize > maxSize) {
		return message.reply(
			getLang(isVideo ? "noVideo" : "noAudio")
		);
	}

	await new Promise((resolve, reject) => {
		message.reply({
			body: title,
			attachment: fs.createReadStream(savePath)
		}, err => err ? reject(err) : resolve());
	});
} catch (error) {
	console.error("[YTB DOWNLOAD]", error);
	return message.reply(getLang("error", error.message));
} finally {
	await fs.remove(savePath).catch(() => {});

	if (status?.messageID) {
		try {
			await message.unsend(status.messageID);
		} catch (_) {}
	}
}

}

function extractVideoID(input) {
const value = String(input || "").trim();

if (/^[\w-]{11}$/.test(value)) return value;

try {
	const url = new URL(
		/^https?:\/\//i.test(value) ? value : `https://${value}`
	);

	if (url.hostname === "youtu.be") {
		return url.pathname.split("/").filter(Boolean)[0] || null;
	}

	if (url.hostname.endsWith("youtube.com") ||
		url.hostname.endsWith("youtube-nocookie.com")) {
		const id = url.searchParams.get("v");

		if (id) return id;

		const match = url.pathname.match(
			/^\/(?:shorts|embed|live|v)\/([\w-]{11})/
		);

		if (match) return match[1];
	}
} catch (_) {}

return null;

}

async function search(keyword) {
const url = "https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}";
const { data } = await axios.get(url, {
timeout: 20000,
headers: {
"User-Agent": "Mozilla/5.0"
}
});

const match = data.match(/var ytInitialData = (\{.*?\});<\/script>/s);

if (!match) {
	throw new Error("YouTube search response could not be parsed.");
}

const json = JSON.parse(match[1]);
const sections =
	json.contents?.twoColumnSearchResultsRenderer?.primaryContents
		?.sectionListRenderer?.contents || [];

const results = [];

for (const section of sections) {
	for (const item of section.itemSectionRenderer?.contents || []) {
		const video = item.videoRenderer;

		if (!video?.videoId || !video.title?.runs?.length) continue;

		results.push({
			id: video.videoId,
			title: video.title.runs.map(x => x.text).join(""),
			thumbnail: video.thumbnail?.thumbnails?.at(-1)?.url,
			time: video.lengthText?.simpleText || "Unknown",
			channel: {
				name: video.ownerText?.runs?.map(x => x.text).join("") || "Unknown"
			}
		});
	}
}

return results;

}

async function getVideoInfo(id) {
const videoID = extractVideoID(id);

if (!videoID) {
	throw new Error("Invalid YouTube video link or ID.");
}

const info = await ytdl.getInfo(videoID);
const details = info.videoDetails;
const channel = info.player_response?.videoDetails || details;

return {
	videoId: details.videoId,
	title: details.title || "Unknown",
	lengthSeconds: Number(details.lengthSeconds) || 0,
	viewCount: Number(details.viewCount) || 0,
	uploadDate: details.uploadDate || "Unknown",
	likes: Number(details.likes) || 0,
	thumbnails: details.thumbnails || [],
	author: details.author || "Unknown",
	channel: {
		id: details.channelId || "",
		name: details.author || "Unknown",
		thumbnails: details.thumbnails || [],
		subscriberCount: Number(details.author?.subscriber_count) || 0
	}
};

}