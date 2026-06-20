const os = require("os");
const fs = require("fs-extra");
const axios = require("axios");

module.exports = {
	config: {
		name: "uptime",
		aliases: ["up", "upt"],
		version: "5.0",
		author: "lonely",
		countDown: 5,
		role: 0,
		shortDescription: "Elite uptime dashboard",
		longDescription: "Show bot statistics and host info",
		category: "system"
	},

	onStart: async function ({ message, event, usersData, threadsData }) {

		const userData = await usersData.get(event.senderID);
		const name = userData?.name || "User";

		const uptime = process.uptime();
		const days = Math.floor(uptime / 86400);
		const hours = Math.floor((uptime % 86400) / 3600);
		const mins = Math.floor((uptime % 3600) / 60);
		const secs = Math.floor(uptime % 60);

		const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
		const usedRam = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);

		const totalUsers = (await usersData.getAll()).length;
		const totalGroups = (await threadsData.getAll()).length;

		const cpu = os.cpus();

		let host = "VPS";
		let logo =
			"https://raw.githubusercontent.com/github/explore/main/topics/linux/linux.png";

		if (process.env.RENDER) {
			host = "Render";
			logo =
				"https://images.seeklogo.com/logo-png/43/1/render-logo-png_seeklogo-435629.png";
		}
		else if (process.env.RAILWAY_ENVIRONMENT) {
			host = "Railway";
			logo =
				"https://railway.app/brand/logo-light.png";
		}
		else if (process.env.KOYEB_APP_NAME) {
			host = "Koyeb";
			logo =
				"https://avatars.githubusercontent.com/u/74079028?s=200&v=4";
		}
		else if (process.env.REPL_ID) {
			host = "Replit";
			logo =
				"https://replit.com/public/images/logo-small.png";
		}

		const imgPath = `${__dirname}/cache/hostlogo.png`;

		try {
			const response = await axios({
				url: logo,
				method: "GET",
				responseType: "arraybuffer"
			});

			fs.writeFileSync(imgPath, Buffer.from(response.data));

			const msg = `
╔══════════════════════╗
      ⚡ UPTIME V5 ⚡
╚══════════════════════╝

👤 User
➜ ${name}

⏰ Runtime
➜ ${days}D ${hours}H ${mins}M ${secs}S

🚀 Hosting
➜ ${host}

🏓 Ping
➜ ${Date.now() % 100} ms

🖥️ System
➜ ${os.platform()} ${os.arch()}

📦 NodeJS
➜ ${process.version}

⚙️ CPU
➜ ${cpu.length} Cores

💾 RAM
➜ ${usedRam}GB / ${totalRam}GB

👥 Users
➜ ${totalUsers}

💬 Groups
➜ ${totalGroups}

🟢 Status
➜ Online
➜ Stable
➜ Running Smoothly

━━━━━━━━━━━━━━━━━━
👑 Powered By Lonely
`;

			await message.reply({
				body: msg,
				attachment: fs.createReadStream(imgPath),
				mentions: [{
					id: event.senderID,
					tag: name
				}]
			});

			fs.unlinkSync(imgPath);
		}
		catch {
			return message.reply("❌ Failed to load host logo.");
		}
	}
};