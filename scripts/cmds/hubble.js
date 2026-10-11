const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const { getStreamFromURL } = global.utils;

const ASSET_DIR = path.join(__dirname, "assets", "hubble");
const DATA_PATH = path.join(ASSET_DIR, "nasa.json");

let hubbleData = [];

module.exports = {
config: {
name: "hubble",
version: "1.4",
author: "NTKhang",
countDown: 5,
role: 0,
description: {
vi: "Xem ảnh từ Hubble",
en: "View Hubble images"
},
category: "media",
guide: {
en: "{pn} <month-day>\nExample: {pn} 06-15"
}
},

langs: {
	vi: {
		invalidDate: "❌ Ngày không hợp lệ. Hãy nhập theo định dạng MM-DD, ví dụ 06-15.",
		noImage: "⭕ Không tìm thấy ảnh cho ngày này.",
		error: "❌ Không thể tải ảnh Hubble. Vui lòng thử lại sau."
	},
	en: {
		invalidDate: "❌ Invalid date. Use MM-DD format, for example: 06-15.",
		noImage: "⭕ No Hubble image was found for this date.",
		error: "❌ Could not load the Hubble image. Please try again later."
	}
},

onLoad: async function () {
	await fs.ensureDir(ASSET_DIR);

	try {
		if (await fs.pathExists(DATA_PATH)) {
			const savedData = await fs.readJson(DATA_PATH);

			if (Array.isArray(savedData) && savedData.length > 0) {
				hubbleData = savedData;
				return;
			}
		}
	} catch (error) {
		console.error("[HUBBLE] Cached dataset could not be read:", error.message);
	}

	const sources = [
		"https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/scripts/cmds/assets/hubble/nasa.json"
	];

	for (const url of sources) {
		try {
			const response = await axios.get(url, {
				timeout: 20000,
				headers: {
					"User-Agent": "Mozilla/5.0",
					"Accept": "application/json"
				}
			});

			if (!Array.isArray(response.data) || response.data.length === 0) {
				throw new Error("The dataset is empty or has an invalid format.");
			}

			hubbleData = response.data;
			await fs.writeJson(DATA_PATH, hubbleData, { spaces: 2 });

			console.log(`[HUBBLE] Loaded ${hubbleData.length} records.`);
			return;
		} catch (error) {
			console.error("[HUBBLE] Dataset download failed:", error.message);
		}
	}

	console.error("[HUBBLE] Unable to load the NASA image dataset.");
},

onStart: async function ({ message, args, getLang }) {
	try {
		const dateText = checkValidDate(args[0] || "");

		if (!dateText) {
			return message.reply(getLang("invalidDate"));
		}

		if (!Array.isArray(hubbleData) || hubbleData.length === 0) {
			return message.reply(
				"❌ The Hubble dataset could not be loaded. Check your Render logs and try again."
			);
		}

		const normalizedDate = dateText.toLowerCase();

		const data = hubbleData.find(item => {
			if (!item || typeof item.date !== "string") return false;

			return item.date.trim().toLowerCase() === normalizedDate;
		});

		if (!data) {
			return message.reply(getLang("noImage"));
		}

		if (!data.image) {
			return message.reply(getLang("noImage"));
		}

		const imageURL = /^https?:\/\//i.test(data.image)
			? data.image
			: "https://imagine.gsfc.nasa.gov/hst_bday/images/" +
				data.image.replace(/^\/+/, "");

		const imageStream = await getStreamFromURL(imageURL);

		const msg =
			`📅 Date: ${data.date}\n` +
			`🌀 Name: ${data.name || "Unknown"}\n` +
			`📖 Caption: ${data.caption || "No caption available"}\n` +
			`🔗 Source: ${data.url || imageURL}`;

		return message.reply({
			body: msg,
			attachment: imageStream
		});
	} catch (error) {
		console.error("[HUBBLE COMMAND]", error);
		return message.reply(getLang("error"));
	}
}

};

const monthText = [
"January", "February", "March", "April",
"May", "June", "July", "August",
"September", "October", "November", "December"
];

function checkValidDate(date) {
if (typeof date !== "string") return null;

const match = date.trim().match(/^(\d{1,2})[-/](\d{1,2})$/);

if (!match) return null;

const month = Number(match[1]);
const day = Number(match[2]);

if (month < 1 || month > 12 || day < 1) return null;

const daysInMonth = [
	31, 29, 31, 30, 31, 30,
	31, 31, 30, 31, 30, 31
];

if (day > daysInMonth[month - 1]) return null;

return `${monthText[month - 1]} ${day}`;

}