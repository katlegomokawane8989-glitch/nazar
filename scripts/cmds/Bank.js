const axios = require("axios");
const { getTime } = global.utils;
const title = "🏦 | NZR𝄞𝗕𝗮𝗻𝗸 v3.0";
const API_BASE = "https://shizubank.vercel.app";

async function request(endpoint, options = {}) {
const response = await axios({
url: "${API_BASE}${endpoint}",
method: options.method || "GET",
data: options.body,
timeout: 20000,
headers: options.body
? { "Content-Type": "application/json" }
: {}
});

return response.data;

}

function money(value) {
return Number(value || 0).toLocaleString("en-US");
}

function errorMessage(error) {
return error.response?.data?.message || error.message || "Unknown error";
}

module.exports = {
config: {
name: "bank",
version: "2.1",
author: "NZR",
countDown: 2,
role: 0,
description: {
en: "Banking, investments, cryptocurrency and lottery"
},
category: "game",
guide: {
en: "{pn} help"
}
},

langs: {
	en: {
		help: "Banking commands",
		success: "Success",
		error: "Error",
		insufficientFunds: "Insufficient funds",
		invalidAmount: "Invalid amount"
	}
},

onStart: async function ({
	message,
	args,
	event,
	usersData,
	api
}) {
	const { senderID } = event;
	const command = String(args[0] || "help").toLowerCase();

	try {
		switch (command) {
			case "help":
				return this.showHelp(message, usersData, senderID);

			case "balance":
			case "bal":
				return this.showBalance(message, senderID, usersData);

			case "deposit":
			case "dep":
				return this.deposit(message, args, usersData, senderID);

			case "withdraw":
			case "wd":
				return this.withdraw(message, args, usersData, senderID);

			case "interest":
				return this.collectInterest(message, senderID);

			case "leaderboard":
			case "top":
				return this.showLeaderboard(message, api);

			case "card":
				return this.handleCard(message, args, usersData, senderID);

			case "stocks":
				return this.handleStocks(message, args, senderID);

			case "crypto":
				return this.handleCrypto(message, args, senderID);

			case "lottery":
				return this.handleLottery(message, args, usersData, senderID);

			case "history":
			case "transactions":
				return this.showHistory(message, senderID);

			default:
				return message.reply(
					`🏦 ${title}\n\n❌ Unknown command.\nUse bank help to see available commands.`
				);
		}
	} catch (error) {
		console.error("[BANK ERROR]", error);
		return message.reply(`❌ Banking error: ${errorMessage(error)}`);
	}
},

showHelp: async function (message, usersData, senderID) {
	let name = "User";

	try {
		const user = await usersData.get(senderID);
		name = user.name || name;
	} catch (_) {}

	return message.reply(
		`🏦 ${title}\n` +
		`━━━━━━━━━━━━━━\n` +
		`Hello ${name}!\n\n` +
		`💰 BASIC BANKING\n` +
		`• bank balance\n` +
		`• bank deposit <amount>\n` +
		`• bank withdraw <amount>\n` +
		`• bank interest\n` +
		`• bank history\n` +
		`• bank top\n\n` +
		`💳 DEBIT CARD\n` +
		`• bank card create\n` +
		`• bank card deposit <amount>\n` +
		`• bank card withdraw <amount>\n\n` +
		`📈 STOCKS\n` +
		`• bank stocks list\n` +
		`• bank stocks buy <symbol> <shares>\n` +
		`• bank stocks sell <symbol> <shares>\n\n` +
		`₿ CRYPTO\n` +
		`• bank crypto list\n` +
		`• bank crypto buy <name> <amount>\n` +
		`• bank crypto sell <name> <amount>\n\n` +
		`🎰 LOTTERY\n` +
		`• bank lottery info\n` +
		`• bank lottery buy <number>\n\n` +
		`♤ Powered by NZR`
	);
},

showBalance: async function (message, senderID, usersData) {
	const data = await request(`/balance/${senderID}`);
	if (!data.success) {
		return message.reply(`❌ ${data.message || "Unable to retrieve balance."}`);
	}

	const b = data.data;
	const user = await usersData.get(senderID);

	return message.reply(
		`🏦 ${title}\n━━━━━━━━━━━━━━\n` +
		`👤 User: ${user.name || "User"}\n\n` +
		`💰 Wallet: $${money(b.cash)}\n` +
		`🏦 Bank: $${money(b.bank)}\n` +
		`💳 Card: $${money(b.card)}\n\n` +
		`📈 Stocks: $${money(b.stocks)}\n` +
		`₿ Crypto: $${money(b.crypto)}\n\n` +
		`💎 Net worth: $${money(b.totalAssets)}\n` +
		`📊 Credit score: ${b.creditScore ?? "N/A"}/850\n` +
		`🎟️ Lottery tickets: ${b.lotteryTickets ?? 0}\n` +
		`🆔 Account ID: ${b.userId || senderID}`
	);
},

deposit: async function (message, args, usersData, senderID) {
	const amount = Number(args[1]);

	if (!Number.isSafeInteger(amount) || amount <= 0) {
		return message.reply("❌ Enter a valid positive whole-number amount.");
	}

	const user = await usersData.get(senderID);
	const balance = Number(user.money) || 0;

	if (balance < amount) {
		return message.reply(`❌ Insufficient wallet funds. Balance: $${money(balance)}`);
	}

	const data = await request("/deposit", {
		method: "POST",
		body: { userId: senderID, amount }
	});

	if (!data.success) {
		return message.reply(`❌ ${data.message || "Deposit failed."}`);
	}

	user.money = balance - amount;
	await usersData.set(senderID, user);

	return message.reply(
		`✅ Deposit successful!\n` +
		`💰 Deposited: $${money(amount)}\n` +
		`👛 Wallet: $${money(user.money)}\n` +
		`🏦 Bank: $${money(data.newBank)}`
	);
},

withdraw: async function (message, args, usersData, senderID) {
	const amount = Number(args[1]);

	if (!Number.isSafeInteger(amount) || amount <= 0) {
		return message.reply("❌ Enter a valid positive whole-number amount.");
	}

	const balance = await request(`/balance/${senderID}`);

	if (!balance.success) {
		return message.reply(`❌ ${balance.message || "Unable to check bank balance."}`);
	}

	const bankBalance = Number(balance.data.bank) || 0;
	const fee = Math.floor(amount * 0.02);

	if (bankBalance < amount + fee) {
		return message.reply(
			`❌ Insufficient bank funds.\n` +
			`Withdrawal: $${money(amount)}\n` +
			`Fee: $${money(fee)}\n` +
			`Bank balance: $${money(bankBalance)}`
		);
	}

	const data = await request("/withdraw", {
		method: "POST",
		body: { userId: senderID, amount }
	});

	if (!data.success) {
		return message.reply(`❌ ${data.message || "Withdrawal failed."}`);
	}

	const user = await usersData.get(senderID);
	user.money = (Number(user.money) || 0) + amount;
	await usersData.set(senderID, user);

	return message.reply(
		`✅ Withdrawal successful!\n` +
		`💰 Withdrawn: $${money(amount)}\n` +
		`💸 Fee: $${money(data.gstAmount ?? fee)}\n` +
		`👛 Wallet: $${money(user.money)}\n` +
		`🏦 Bank: $${money(data.newBank)}`
	);
},

collectInterest: async function (message, senderID) {
	const data = await request(`/interest/collect/${senderID}`, {
		method: "POST"
	});

	if (!data.success) {
		return message.reply(`❌ ${data.message || "Unable to collect interest."}`);
	}

	return message.reply(
		`💰 Interest collected!\n` +
		`Earned: $${money(data.interest)}\n` +
		`Waited: ${data.hoursWaited} hours\n` +
		`🏦 Bank balance: $${money(data.newBank)}`
	);
},

showLeaderboard: async function (message, api) {
	const data = await request("/leaderboard");

	if (!data.success) {
		return message.reply(`❌ ${data.message || "Unable to load leaderboard."}`);
	}

	const leaderboard = Array.isArray(data.leaderboard)
		? data.leaderboard
		: [];

	if (!leaderboard.length) {
		return message.reply("🏆 No leaderboard data is available.");
	}

	let names = {};

	try {
		const ids = leaderboard.map(user => String(user.userId));
		if (api?.getUserInfo) {
			names = await api.getUserInfo(ids) || {};
		}
	} catch (_) {}

	let output = `🏦 ${title}\n🏆 RICHEST PLAYERS\n━━━━━━━━━━━━━━\n\n`;

	leaderboard.slice(0, 10).forEach((user, index) => {
		const id = String(user.userId);
		const profile = names[id];
		const name = profile?.name || id;

		output += `${["🥇", "🥈", "🥉"][index] || `${index + 1}.`} ${name}\n`;
		output += `💎 Total assets: $${money(user.totalAssets)}\n`;
		output += `━━━━━━━━━━━━━━\n`;
	});

	return message.reply(output);
},

handleCard: async function (message, args, usersData, senderID) {
	const action = String(args[1] || "").toLowerCase();
	const amount = Number(args[2]);

	if (action === "create") {
		const data = await request("/card/create", {
			method: "POST",
			body: { userId: senderID }
		});

		if (!data.success) {
			return message.reply(`❌ ${data.message || "Card creation failed."}`);
		}

		return message.reply(
			`✅ Debit card created!\n` +
			`💳 Card number: ${data.cardNumber}\n` +
			`📊 Daily limit: $${money(data.dailyLimit)}`
		);
	}

	if (!["deposit", "withdraw"].includes(action)) {
		return message.reply("Usage: bank card <create/deposit/withdraw> [amount]");
	}

	if (!Number.isSafeInteger(amount) || amount <= 0) {
		return message.reply("❌ Enter a valid positive whole-number amount.");
	}

	const user = await usersData.get(senderID);
	const wallet = Number(user.money) || 0;

	if (action === "deposit" && wallet < amount) {
		return message.reply("❌ Insufficient wallet funds.");
	}

	const data = await request(`/card/${action}`, {
		method: "POST",
		body: { userId: senderID, amount }
	});

	if (!data.success) {
		return message.reply(`❌ ${data.message || "Card transaction failed."}`);
	}

	if (action === "deposit") {
		user.money = wallet - amount;
	} else {
		user.money = wallet + amount;
	}

	await usersData.set(senderID, user);

	return message.reply(
		`✅ Card ${action} successful!\n` +
		`💰 Amount: $${money(amount)}\n` +
		`👛 Wallet: $${money(user.money)}\n` +
		`💳 Card balance: $${money(data.newCardBalance)}`
	);
},

handleStocks: async function (message, args, senderID) {
	const action = String(args[1] || "").toLowerCase();

	if (action === "list") {
		const data = await request("/stocks/list");

		if (!data.success) {
			return message.reply(`❌ ${data.message || "Unable to load stocks."}`);
		}

		const stocks = Array.isArray(data.stocks) ? data.stocks : [];

		if (!stocks.length) {
			return message.reply("📈 No stocks are currently available.");
		}

		return message.reply(
			`📈 STOCK MARKET\n━━━━━━━━━━━━━━\n\n` +
			stocks.map(stock =>
				`${stock.trend || "📊"} ${stock.symbol}: $${money(stock.price)}\n` +
				`Multiplier: ${stock.multiplier}x\n` +
				`Volatility: ${(Number(stock.volatility || 0) * 100).toFixed(1)}%`
			).join("\n\n") +
			`\n\nBuy: bank stocks buy <symbol> <shares>\nSell: bank stocks sell <symbol> <shares>`
		);
	}

	const symbol = String(args[2] || "").toUpperCase();
	const shares = Number(args[3]);

	if (!["buy", "sell"].includes(action) ||
		!symbol ||
		!Number.isSafeInteger(shares) ||
		shares <= 0) {
		return message.reply("Usage: bank stocks <list/buy/sell> [symbol] [shares]");
	}

	const data = await request(`/stocks/${action}`, {
		method: "POST",
		body: { userId: senderID, symbol, shares }
	});

	if (!data.success) {
		return message.reply(`❌ ${data.message || `Stock ${action} failed.`}`);
	}

	return message.reply(
		`✅ Stock ${action} successful!\n` +
		`📈 Symbol: ${data.symbol || symbol}\n` +
		`📊 Shares: ${data.shares ?? shares}\n` +
		`💰 Value: $${money(data.totalCost ?? data.totalValue)}`
	);
},

handleCrypto: async function (message, args, senderID) {
	const action = String(args[1] || "").toLowerCase();

	if (action === "list") {
		const data = await request("/crypto/list");

		if (!data.success) {
			return message.reply(`❌ ${data.message || "Unable to load cryptocurrency."}`);
		}

		const cryptos = Array.isArray(data.cryptos) ? data.cryptos : [];

		if (!cryptos.length) {
			return message.reply("₿ No cryptocurrencies are currently available.");
		}

		return message.reply(
			`₿ CRYPTO MARKET\n━━━━━━━━━━━━━━\n\n` +
			cryptos.map(crypto =>
				`${crypto.trend || "📊"} ${crypto.name} (${crypto.symbol}): $${Number(crypto.price || 0).toFixed(3)}\n` +
				`Multiplier: ${crypto.multiplier}x\n` +
				`Volatility: ${(Number(crypto.volatility || 0) * 100).toFixed(1)}%`
			).join("\n\n") +
			`\n\nBuy: bank crypto buy <name> <amount>\nSell: bank crypto sell <name> <amount>`
		);
	}

	const cryptoName = String(args[2] || "").toLowerCase();
	const amount = Number(args[3]);

	if (!["buy", "sell"].includes(action) ||
		!cryptoName ||
		!Number.isFinite(amount) ||
		amount <= 0) {
		return message.reply("Usage: bank crypto <list/buy/sell> [name] [amount]");
	}

	const data = await request(`/crypto/${action}`, {
		method: "POST",
		body: { userId: senderID, cryptoName, amount }
	});

	if (!data.success) {
		return message.reply(`❌ ${data.message || `Crypto ${action} failed.`}`);
	}

	return message.reply(
		`✅ Crypto ${action} successful!\n` +
		`₿ Asset: ${data.cryptoName || cryptoName}\n` +
		`📊 Amount: ${data.amount ?? amount}\n` +
		`💰 Value: $${money(data.totalCost ?? data.totalValue)}`
	);
},

handleLottery: async function (message, args, usersData, senderID) {
	const action = String(args[1] || "").toLowerCase();

	if (action === "info") {
		const data = await request(`/lottery/info/${senderID}`);

		if (!data.success) {
			return message.reply(`❌ ${data.message || "Unable to load lottery information."}`);
		}

		return message.reply(
			`🎰 LOTTERY\n━━━━━━━━━━━━━━\n\n` +
			`💰 Prize pool: $${money(data.prizePool)}\n` +
			`🎫 Ticket price: $${money(data.ticketPrice)}\n` +
			`🎟️ Your tickets: ${data.userTickets ?? 0}\n` +
			`⏰ Next draw: ${data.nextDraw || "Unknown"}\n\n` +
			`Buy: bank lottery buy <number> (1-100)`
		);
	}

	if (action === "buy") {
		const number = Number(args[2]);

		if (!Number.isInteger(number) || number < 1 || number > 100) {
			return message.reply("Usage: bank lottery buy <number> (1-100)");
		}

		const data = await request("/lottery/buy", {
			method: "POST",
			body: { userId: senderID, number }
		});

		if (!data.success) {
			return message.reply(`❌ ${data.message || "Lottery purchase failed."}`);
		}

		return message.reply(
			`🎫 Lottery ticket purchased!\n` +
			`🔢 Number: ${data.number ?? number}\n` +
			`💰 Price: $${money(data.ticketPrice)}\n` +
			`🏆 Prize pool: $${money(data.prizePool)}`
		);
	}

	return message.reply("Usage: bank lottery <info/buy> [number]");
},

showHistory: async function (message, senderID) {
	const data = await request(`/transactions/${senderID}?limit=10`);

	if (!data.success) {
		return message.reply(`❌ ${data.message || "Unable to load transaction history."}`);
	}

	const transactions = Array.isArray(data.transactions)
		? data.transactions
		: [];

	if (!transactions.length) {
		return message.reply("📭 No transactions found.");
	}

	const output = transactions.map(tx =>
		`${tx.icon || "📋"} ${tx.description || tx.type || "Transaction"}\n` +
		`🕒 ${tx.timeAgo || ""} ${tx.date || ""}\n` +
		`💰 Amount: $${money(tx.amount)}`
	).join("\n\n━━━━━━━━━━━━━━\n\n");

	return message.reply(
		`🏦 ${title}\n📋 TRANSACTION HISTORY\n━━━━━━━━━━━━━━\n\n${output}`
	);
}

};