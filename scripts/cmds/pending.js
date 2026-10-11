const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "pendingData");
const DATA_FILE = path.join(DATA_DIR, "groups.json");
const APPROVAL_TIME = 30 * 1000;

const pendingGroups = new Map();
const timers = new Map();

let initialized = false;

async function loadData() {
await fs.ensureDir(DATA_DIR);

if (!(await fs.pathExists(DATA_FILE))) {
	await fs.writeJson(DATA_FILE, {});
}

return fs.readJson(DATA_FILE);

}

async function saveGroup(threadID, data) {
const groups = await loadData();
groups[threadID] = data;
await fs.writeJson(DATA_FILE, groups, { spaces: 2 });
}

async function removeGroup(threadID) {
const groups = await loadData();
delete groups[threadID];
await fs.writeJson(DATA_FILE, groups, { spaces: 2 });
}

function isBotAdmin(event, permission) {
const adminIDs = permission?.adminIDs || [];
const senderID = String(event.senderID || "");

return adminIDs.some(id => String(id) === senderID);

}

function getAdminIDs(globalGoat) {
try {
const admins = globalGoat.config?.adminBot || [];
return admins.map(id => String(id));
} catch (_) {
return [];
}
}

module.exports = {
config: {
name: "pending",
aliases: ["approve"],
version: "1.0.0",
author: "NZR",
countDown: 3,
role: 0,
shortDescription: "Approve groups before the bot can stay",
longDescription: "Requires approval within 30 seconds after the bot joins a group.",
category: "system",
guide: {
en: "{pn} — list groups awaiting approval\n{pn} approve <number> — approve a group\n{pn} approve <threadID> — approve using a group ID"
}
},

onStart: async function ({ message, args, event, threadsData, api }) {
	const adminIDs = getAdminIDs(global.GoatBot || global);
	const senderID = String(event.senderID || "");

	if (!adminIDs.includes(senderID)) {
		return message.reply("❌ Only bot admins can use this command.");
	}

	const groups = await loadData();
	const entries = Object.entries(groups)
		.filter(([id]) => pendingGroups.has(id));

	if (args[0]?.toLowerCase() === "approve") {
		const target = args[1];

		if (!target) {
			return message.reply(
				"Usage: -pending approve <number>\nExample: -pending approve 1"
			);
		}

		const selected = /^\d+$/.test(target) && entries[Number(target) - 1]
			? entries[Number(target) - 1]
			: groups[target]
				? [target, groups[target]]
				: null;

		if (!selected) {
			return message.reply("❌ Group not found in the pending list.");
		}

		const [threadID, data] = selected;
		const timer = timers.get(threadID);

		if (timer) clearTimeout(timer);

		timers.delete(threadID);
		pendingGroups.delete(threadID);
		await removeGroup(threadID);

		try {
			const info = await threadsData.get(threadID);
			const groupName = info?.threadName || data.name || "New Group";

			await api.sendMessage(
				`✅ GROUP APPROVED\n\n` +
				`Group: ${groupName}\n` +
				`Bot: ${global.GoatBot?.config?.nickName || "NZR Bot"}\n` +
				`Owner: NZR\n\n` +
				`Thank you for adding the bot. The group has been approved!`,
				threadID
			);

			return message.reply(`✅ Successfully approved ${groupName}.`);
		} catch (error) {
			console.error("[PENDING APPROVE]", error);
			return message.reply(
				"⚠️ The group was approved in the local list, but the greeting could not be sent."
			);
		}
	}

	if (entries.length === 0) {
		return message.reply("✅ There are no groups awaiting approval.");
	}

	const lines = await Promise.all(entries.map(async ([id, data], index) => {
		let name = data.name || "Unknown Group";

		try {
			const info = await threadsData.get(id);
			name = info?.threadName || name;
		} catch (_) {}

		return `${index + 1}. ${name}\n   ID: ${id}`;
	}));

	return message.reply(
		`╭─「 PENDING GROUPS 」\n` +
		`│ Groups awaiting approval: ${entries.length}\n` +
		`├────────────────\n` +
		lines.map(line => `│ ${line}`).join("\n") +
		`\n╰────────────────\n` +
		`Approve: -pending approve <number>`
	);
},

onEvent: async function ({ event, api, threadsData }) {
	if (!event || event.logMessageType !== "log:subscribe") return;

	const botID = String(global.GoatBot?.botID || "");
	const added = event.logMessageData?.addedParticipants || [];

	if (!added.some(user => String(user.userFbId) === botID)) return;

	const threadID = String(event.threadID);

	try {
		const info = await threadsData.get(threadID);
		const data = {
			name: info?.threadName || "Unknown Group",
			threadID,
			joinedAt: Date.now(),
			expiresAt: Date.now() + APPROVAL_TIME
		};

		pendingGroups.set(threadID, data);
		await saveGroup(threadID, data);

		await api.sendMessage(
			`⏳ APPROVAL REQUIRED\n\n` +
			`This group has 30 seconds to be approved by a bot admin.\n` +
			`Admins: use -pending to check requests, then -pending approve 1.\n\n` +
			`If it is not approved within 30 seconds, the bot will leave.`,
			threadID
		);

		if (timers.has(threadID)) clearTimeout(timers.get(threadID));

		const timer = setTimeout(async () => {
			if (!pendingGroups.has(threadID)) return;

			pendingGroups.delete(threadID);
			timers.delete(threadID);

			try {
				await removeGroup(threadID);
				await api.sendMessage(
					"⌛ Approval time expired. The bot is leaving this group.",
					threadID
				);
			} catch (_) {}

			try {
				await api.removeUserFromGroup(botID, threadID);
			} catch (error) {
				console.error("[PENDING LEAVE]", error);
			}
		}, APPROVAL_TIME);

		timers.set(threadID, timer);
	} catch (error) {
		console.error("[PENDING EVENT]", error);
	}
}

};