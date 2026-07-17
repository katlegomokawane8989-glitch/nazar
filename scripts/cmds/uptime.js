const os = require("os");

module.exports = {
	config: {
		name: "uptime",
		aliases: ["up","upt"],
		version: "3.1",
		author: "NZR",
		countDown: 5,
		role: 0,
		shortDescription: "Bot status",
		longDescription: "Display bot uptime and system information",
		category: "system",
		guide: {
			en: "{pn}"
		}
	},

	onStart: async function ({ message, usersData, threadsData }) {
		const start = Date.now();

		const up = process.uptime();
		const days = Math.floor(up / 86400);
		const hours = Math.floor((up % 86400) / 3600);
		const minutes = Math.floor((up % 3600) / 60);
		const seconds = Math.floor(up % 60);

		const totalRAM = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
		const freeRAM = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
		const usedRAM = (totalRAM - freeRAM).toFixed(2);

		const cpu = os.cpus()[0].model;
		const platform = `${os.type()} ${os.release()}`;
		const hostname = os.hostname();
		const node = process.version;
		const load = os.loadavg()[0].toFixed(2);
		const ping = Date.now() - start;

		let userCount = "Unknown";
		let threadCount = "Unknown";

		try {
			const users = await usersData.getAll();
			userCount = users.length;
		} catch {}

		try {
			const threads = await threadsData.getAll();
			threadCount = threads.length;
		} catch {}

		return message.reply(
`╭━━━〔 ⚡ BOT STATUS ⚡ 〕━━━╮
│
│ ⏳ Uptime : ${days}d ${hours}h ${minutes}m ${seconds}s
│ 📡 Ping   : ${ping} ms
│ 🖥️ Host   : ${hostname}
│ 💻 OS     : ${platform}
│ ⚙️ CPU    : ${cpu}
│ 📈 Load   : ${load}
│ 🧠 RAM    : ${usedRAM} GB / ${totalRAM} GB
│ 🟢 Node   : ${node}
│ 👥 Users  : ${userCount}
│ 💬 Groups : ${threadCount}
│
│ 👑 Author : NZR
╰━━━━━━━━━━━━━━━━━━━━━━╯`
		);
	}
};