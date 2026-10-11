module.exports = {
config: {
name: "top",
version: "1.0.0",
author: "NZR",
countDown: 5,
role: 0,
shortDescription: "Show the richest users",
longDescription: "Displays the users with the highest balances.",
category: "economy",
guide: "{pn} [number]"
},

onStart: async function ({ message, usersData, args }) {
	try {
		const limit = Math.min(
			100,
			Math.max(1, parseInt(args[0], 10) || 10)
		);

		const allUsers = await usersData.getAll();

		if (!Array.isArray(allUsers) || allUsers.length === 0) {
			return message.reply("❌ No user money data was found.");
		}

		const ranked = allUsers
			.map(user => ({
				uid: String(user.userID ?? user.id ?? ""),
				money: Number(
					user.money ??
					user.data?.money ??
					user.data?.balance ??
					user.balance ??
					0
				)
			}))
			.filter(user => user.uid && Number.isFinite(user.money))
			.sort((a, b) => b.money - a.money)
			.slice(0, limit);

		if (ranked.length === 0) {
			return message.reply("❌ No users with valid balances were found.");
		}

		const lines = await Promise.all(
			ranked.map(async (user, index) => {
				let name = user.uid;

				try {
					name = await usersData.getName(user.uid) || name;
				} catch (_) {}

				return `${index + 1}. ${name}\n   💰 ${user.money.toLocaleString()}`;
			})
		);

		return message.reply(
			`╭─「 💰 TOP RICHEST USERS 」\n` +
			`│ Total ranked: ${ranked.length}\n` +
			`├────────────────\n` +
			lines.map(line => `│ ${line}`).join("\n") +
			`\n╰────────────────\n` +
			`♤ Powered by NZR`
		);
	} catch (error) {
		console.error("[TOP COMMAND]", error);
		return message.reply(
			"❌ Could not load the money rankings. Check your usersData API and money database."
		);
	}
}

};