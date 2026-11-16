process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

// copyright @ItzPriyanshi

const http = require("http");
const os = require("os");
const axios = require("axios");
const fs = require("fs-extra");
const google = require("googleapis").google;
const nodemailer = require("nodemailer");
const log = require('./logger/log.js');
const path = require("path");

process.env.BLUEBIRD_W_FORGOTTEN_RETURN = 0;

const serverState = {
	startedAt: Date.now(),
	requests: 0,
	ping: {
		sent: 0,
		ok: 0,
		failed: 0,
		consecutiveFailures: 0,
		lastStatus: null,
		lastAt: null,
		lastError: null,
		targets: []
	}
};

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

function formatDuration(ms) {
	const s = Math.floor(ms / 1000);
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	return `${d}d ${h}h ${m}m ${s % 60}s`;
}

function buildStats() {
	const mem = process.memoryUsage();
	const goat = global.GoatBot || {};
	return {
		status: "ok",
		botOnline: Boolean(goat.botID),
		uptime: formatDuration(Date.now() - serverState.startedAt),
		uptimeSeconds: Math.floor((Date.now() - serverState.startedAt) / 1000),
		commands: goat.commands ? goat.commands.size : 0,
		eventCommands: goat.eventCommands ? goat.eventCommands.size : 0,
		requests: serverState.requests,
		memory: {
			rssMB: Math.round(mem.rss / 1048576),
			heapUsedMB: Math.round(mem.heapUsed / 1048576),
			systemFreeMB: Math.round(os.freemem() / 1048576)
		},
		node: process.version,
		platform: `${os.platform()} ${os.arch()}`,
		ping: serverState.ping,
		time: new Date().toISOString()
	};
}

function renderStatusPage(stats) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GoatBot Status</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:system-ui,sans-serif;color:#e2e8f0}
.card{background:#1e293b;border-radius:16px;padding:32px 40px;min-width:300px;box-shadow:0 10px 40px rgba(0,0,0,.4)}
h1{margin:0 0 20px;font-size:22px}
.row{display:flex;justify-content:space-between;gap:32px;padding:8px 0;border-bottom:1px solid #334155;font-size:14px}
.row:last-child{border:0}
.on{color:#4ade80}.off{color:#f87171}
</style>
</head>
<body>
<div class="card">
<h1>GoatBot Status</h1>
<div class="row"><span>Bot</span><span class="${stats.botOnline ? "on" : "off"}">${stats.botOnline ? "Online" : "Starting"}</span></div>
<div class="row"><span>Uptime</span><span>${stats.uptime}</span></div>
<div class="row"><span>Commands</span><span>${stats.commands}</span></div>
<div class="row"><span>Memory</span><span>${stats.memory.rssMB} MB</span></div>
<div class="row"><span>Pings OK / Failed</span><span>${stats.ping.ok} / ${stats.ping.failed}</span></div>
</div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
	serverState.requests++;
	const pathname = (req.url || "/").split("?")[0];

	if (req.method === "HEAD") {
		res.writeHead(200);
		return res.end();
	}

	if (pathname === "/health" || pathname === "/ping") {
		res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
		return res.end("OK");
	}

	if (pathname === "/stats" || pathname === "/api/stats") {
		res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
		return res.end(JSON.stringify(buildStats(), null, 2));
	}

	if (pathname === "/") {
		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
		return res.end(renderStatusPage(buildStats()));
	}

	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ status: "not_found" }));
});

server.on("error", err => {
	if (err.code === "EADDRINUSE")
		log.error("SERVER", `Port ${PORT} is already in use`);
	else
		log.error("SERVER", err.message);
});

server.listen(PORT, HOST, () => log.info("SERVER", `Listening on ${HOST}:${PORT}`));

let shuttingDown = false;
function shutdown(signal) {
	if (shuttingDown)
		return;
	shuttingDown = true;
	log.info("SHUTDOWN", `${signal} received, closing`);
	server.close(() => process.exit(0));
	setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

function validJSON(pathDir) {
	if (!fs.existsSync(pathDir))
		throw new Error(`File "${pathDir}" not found`);
	try {
		JSON.parse(fs.readFileSync(pathDir, "utf-8"));
		return true;
	}
	catch (err) {
		throw new Error(err.message);
	}
}

const { NODE_ENV } = process.env;
const dirConfig = path.normalize(`${__dirname}/config${['production', 'development'].includes(NODE_ENV) ? '.dev.json' : '.json'}`);
const dirConfigCommands = path.normalize(`${__dirname}/configCommands${['production', 'development'].includes(NODE_ENV) ? '.dev.json' : '.json'}`);
const dirAccount = path.normalize(`${__dirname}/account${['production', 'development'].includes(NODE_ENV) ? '.dev.txt' : '.txt'}`);

for (const pathDir of [dirConfig, dirConfigCommands]) {
	try {
		validJSON(pathDir);
	}
	catch (err) {
		log.error("CONFIG", `Invalid JSON file "${pathDir.replace(__dirname, "")}":\n${err.message.split("\n").map(line => `  ${line}`).join("\n")}\nPlease fix it and restart bot`);
		process.exit(0);
	}
}
const config = require(dirConfig);
if (config.whiteListMode?.whiteListIds && Array.isArray(config.whiteListMode.whiteListIds))
	config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds.map(id => id.toString());
const configCommands = require(dirConfigCommands);

global.GoatBot = {
	startTime: Date.now() - process.uptime() * 1000,
	commands: new Map(),
	eventCommands: new Map(),
	commandFilesPath: [],
	eventCommandsFilesPath: [],
	aliases: new Map(),
	onFirstChat: [],
	onChat: [],
	onEvent: [],
	onReply: new Map(),
	onReaction: new Map(),
	onAnyEvent: [],
	config,
	configCommands,
	envCommands: {},
	envEvents: {},
	envGlobal: {},
	reLoginBot: function () { },
	Listening: null,
	oldListening: [],
	callbackListenTime: {},
	storage5Message: [],
	fcaApi: null,
	botID: null
};

global.db = {
	allThreadData: [],
	allUserData: [],
	allDashBoardData: [],
	allGlobalData: [],
	threadModel: null,
	userModel: null,
	dashboardModel: null,
	globalModel: null,
	threadsData: null,
	usersData: null,
	dashBoardData: null,
	globalData: null,
	receivedTheFirstMessage: {}
};

global.client = {
	dirConfig,
	dirConfigCommands,
	dirAccount,
	countDown: {},
	cache: {},
	database: {
		creatingThreadData: [],
		creatingUserData: [],
		creatingDashBoardData: [],
		creatingGlobalData: []
	},
	commandBanned: configCommands.commandBanned
};

const utils = require("./utils.js");
global.utils = utils;
const { colors } = utils;

global.temp = {
	createThreadData: [],
	createUserData: [],
	createThreadDataError: [],
	filesOfGoogleDrive: {
		arraybuffer: {},
		stream: {},
		fileNames: {}
	},
	contentScripts: {
		cmds: {},
		events: {}
	}
};

const watchAndReloadConfig = (dir, type, prop, logName) => {
	let lastModified = fs.statSync(dir).mtimeMs;
	let isFirstModified = true;

	fs.watch(dir, (eventType) => {
		if (eventType === type) {
			const oldConfig = global.GoatBot[prop];

			setTimeout(() => {
				try {
					if (isFirstModified) {
						isFirstModified = false;
						return;
					}
					if (lastModified === fs.statSync(dir).mtimeMs) {
						return;
					}
					global.GoatBot[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
					log.success(logName, `Reloaded ${dir.replace(process.cwd(), "")}`);
				}
				catch (err) {
					log.warn(logName, `Can't reload ${dir.replace(process.cwd(), "")}`);
					global.GoatBot[prop] = oldConfig;
				}
				finally {
					lastModified = fs.statSync(dir).mtimeMs;
				}
			}, 200);
		}
	});
};

watchAndReloadConfig(dirConfigCommands, 'change', 'configCommands', 'CONFIG COMMANDS');
watchAndReloadConfig(dirConfig, 'change', 'config', 'CONFIG');

global.GoatBot.envGlobal = global.GoatBot.configCommands.envGlobal;
global.GoatBot.envCommands = global.GoatBot.configCommands.envCommands;
global.GoatBot.envEvents = global.GoatBot.configCommands.envEvents;

const getText = global.utils.getText;

if (config.autoRestart) {
	const time = config.autoRestart.time;
	if (!isNaN(time) && time > 0) {
		utils.log.info("AUTO RESTART", getText("Goat", "autoRestart1", utils.convertTime(time, true)));
		setTimeout(() => {
			utils.log.info("AUTO RESTART", "Restarting...");
			process.exit(2);
		}, time);
	}
	else if (typeof time == "string" && time.match(/^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/gmi)) {
		utils.log.info("AUTO RESTART", getText("Goat", "autoRestart2", time));
		const cron = require("node-cron");
		cron.schedule(time, () => {
			utils.log.info("AUTO RESTART", "Restarting...");
			process.exit(2);
		});
	}
}

function resolvePingTargets() {
	const cfg = config.autoPing || {};
	const raw = [
		...(Array.isArray(cfg.urls) ? cfg.urls : []),
		cfg.url,
		process.env.PING_URL,
		process.env.RENDER_EXTERNAL_URL
	];
	const targets = [];
	for (const item of raw) {
		if (!item || typeof item !== "string")
			continue;
		try {
			const url = new URL(item.trim());
			if (!["/health", "/ping"].includes(url.pathname))
				url.pathname = "/health";
			const href = url.toString();
			if (!targets.includes(href))
				targets.push(href);
		}
		catch (err) {
			log.warn("AUTO PING", `Ignored invalid URL "${item}"`);
		}
	}
	return targets;
}

async function pingOnce(targets) {
	for (const target of targets) {
		serverState.ping.sent++;
		serverState.ping.lastAt = new Date().toISOString();
		try {
			const res = await axios.get(target, {
				timeout: 15000,
				headers: { "User-Agent": "GoatBot-AutoPing/1.0" },
				validateStatus: () => true
			});
			serverState.ping.lastStatus = res.status;
			if (res.status >= 200 && res.status < 400) {
				serverState.ping.ok++;
				serverState.ping.consecutiveFailures = 0;
				serverState.ping.lastError = null;
			}
			else {
				serverState.ping.failed++;
				serverState.ping.consecutiveFailures++;
				serverState.ping.lastError = `HTTP ${res.status}`;
				log.warn("AUTO PING", `${target} responded with ${res.status}`);
			}
		}
		catch (err) {
			serverState.ping.failed++;
			serverState.ping.consecutiveFailures++;
			serverState.ping.lastStatus = null;
			serverState.ping.lastError = err.message;
			log.warn("AUTO PING", `${target} failed: ${err.message}`);
		}
	}
}

function startAutoPing() {
	const cfg = config.autoPing || {};
	if (cfg.enable === false || process.env.AUTO_PING === "false")
		return;

	const targets = resolvePingTargets();
	if (!targets.length) {
		log.info("AUTO PING", "No public URL found. Set RENDER_EXTERNAL_URL, PING_URL or config.autoPing.url to enable");
		return;
	}

	const interval = Math.max(10000, Number(process.env.PING_INTERVAL || cfg.interval) || 240000);
	serverState.ping.targets = targets;
	log.info("AUTO PING", `Pinging ${targets.length} target(s) every ${Math.round(interval / 1000)}s`);

	setTimeout(() => pingOnce(targets), Math.min(interval, 10000));
	setInterval(() => pingOnce(targets), interval);
}

function startMemoryGuard() {
	const cfg = config.memoryGuard || {};
	const maxMB = Number(process.env.MEMORY_LIMIT_MB || cfg.maxMB) || 0;
	if (maxMB <= 0)
		return;
	const checkEvery = Math.max(30000, Number(cfg.checkInterval) || 60000);
	log.info("MEMORY GUARD", `Restart threshold set to ${maxMB} MB`);
	setInterval(() => {
		const rssMB = Math.round(process.memoryUsage().rss / 1048576);
		if (rssMB >= maxMB) {
			log.warn("MEMORY GUARD", `Memory ${rssMB} MB reached limit ${maxMB} MB, restarting`);
			process.exit(2);
		}
	}, checkEvery);
}

startAutoPing();
startMemoryGuard();

(async () => {
	const { gmailAccount = {} } = config.credentials || {};
	const { email, clientId, clientSecret, refreshToken } = gmailAccount;
	let mailAuth = null;

	if (email && clientId && clientSecret && refreshToken) {
		try {
			const OAuth2 = google.auth.OAuth2;
			const OAuth2_client = new OAuth2(clientId, clientSecret);
			OAuth2_client.setCredentials({ refresh_token: refreshToken });
			const accessToken = await OAuth2_client.getAccessToken();
			mailAuth = {
				type: 'OAuth2',
				user: email,
				clientId,
				clientSecret,
				refreshToken,
				accessToken
			};
		}
		catch (err) {
			log.warn("MAIL", getText("Goat", "googleApiTokenExpired"));
		}
	}
	else
		log.warn("MAIL", "Gmail credentials missing, mail features disabled");

	const createTransporter = () => nodemailer.createTransport({
		host: 'smtp.gmail.com',
		service: 'Gmail',
		auth: mailAuth
	});

	async function sendMail({ to, subject, text, html, attachments }) {
		if (!mailAuth)
			throw new Error("Mail is not configured");
		const info = await createTransporter().sendMail({
			from: email,
			to,
			subject,
			text,
			html,
			attachments
		});
		return info;
	}

	global.utils.sendMail = sendMail;
	global.utils.transporter = mailAuth ? createTransporter() : null;

	try {
		const { data: { version } } = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/package.json", { timeout: 10000 });
		const currentVersion = require("./package.json").version;
		if (compareVersion(version, currentVersion) === 1)
			utils.log.master("NEW VERSION", getText(
				"Goat",
				"newVersionDetected",
				colors.gray(currentVersion),
				colors.hex("#eb6a07", version),
				colors.hex("#eb6a07", "node update")
			));
	}
	catch (err) {
		log.warn("VERSION", `Version check skipped: ${err.message}`);
	}

	try {
		const parentIdGoogleDrive = await utils.drive.checkAndCreateParentFolder("GoatBot");
		utils.drive.parentID = parentIdGoogleDrive;
	}
	catch (err) {
		log.warn("DRIVE", `Google Drive folder check skipped: ${err.message}`);
	}

	require(`./bot/login/login${NODE_ENV === 'development' ? '.dev.js' : '.js'}`);
})();

function compareVersion(version1, version2) {
	const v1 = version1.split(".");
	const v2 = version2.split(".");
	for (let i = 0; i < 3; i++) {
		if (parseInt(v1[i]) > parseInt(v2[i]))
			return 1;
		if (parseInt(v1[i]) < parseInt(v2[i]))
			return -1;
	}
	return 0;
}
