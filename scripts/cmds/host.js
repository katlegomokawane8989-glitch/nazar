const os = require("os");

module.exports = {
	config: {
		name: "host",
		aliases: ["hosting"],
		version: "1.0",
		author: "NZR",
		countDown: 5,
		role: 0,
		shortDescription: "Show hosting information",
		longDescription: "Display the hosting platform and system information",
		category: "system",
		guide: {
			en: "{pn}"
		}
	},

	onStart: async function ({ message }) {
		const start = Date.now();

		let host = "Unknown";

		if (process.env.RENDER)
			host = "Render";
		else if (process.env.RAILWAY_ENVIRONMENT)
			host = "Railway";
		else if (process.env.REPL_ID)
			host = "Replit";
		else if (process.env.HEROKU_APP_NAME)
			host = "Heroku";
		else if (process.env.KOYEB_APP_NAME)
			host = "Koyeb";
		else if (process.env.CODESPACE_NAME)
			host = "GitHub Codespaces";
		else if (process.env.VERCEL)
			host = "Vercel";

		const ping = Date.now() - start;

		const uptime = process.uptime();
		const days = Math.floor(uptime / 86400);
		const hours = Math.floor((uptime % 86400) / 3600);
		const minutes = Math.floor((uptime % 3600) / 60);
		const seconds = Math.floor(uptime % 60);

		const totalRAM = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
		const freeRAM = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
		const usedRAM = (totalRAM - freeRAM).toFixed(2);

		const msg = `╭━━━〔 🌐 HOST INFO 🌐 〕━━━╮
│
│ 🌍 Host      : ${host}
│ 🟢 Status    : Online
│ 📡 Ping      : ${ping} ms
│ ⏳ Uptime    : ${days}d ${hours}h ${minutes}m ${seconds}s
│ 💻 Platform  : ${os.platform()}
│ ⚙️ CPU       : ${os.cpus()[0].model}
│ 🧠 RAM       : ${usedRAM} GB / ${totalRAM} GB
│ 🟢 Node.js   : ${process.version}
│
│ 👑 Author    : NZR
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

		return message.reply(msg);
	}
};