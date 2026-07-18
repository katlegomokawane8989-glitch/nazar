const { getTime } = global.utils;
const title = "🏦| 𝗩𝗼𝗹𝗱𝗶𝗕𝗮𝗻𝗸 v1.0";

module.exports = {
  config: {
    name: "bank",
    version: "2.0",
    author: "Aryan Chauhan",
    countDown: 0,
    role: 0,
    description: {
      vi: "Hệ thống ngân hàng đơn giản với các tính năng cơ bản",
      en: "Simple banking system with essential features"
    },
    category: "game",
    guide: {
      vi: "Sử dụng {pn} help để xem tất cả lệnh",
      en: "Use {pn} help to see all commands"
    }
  },

  langs: {
    vi: {
      help: "Danh sách lệnh ngân hàng",
      success: "Thành công",
      error: "Lỗi",
      insufficientFunds: "Không đủ tiền",
      invalidAmount: "Số tiền không hợp lệ"
    },
    en: {
      help: "Banking commands list",
      success: "Success",
      error: "Error",
      insufficientFunds: "Insufficient funds",
      invalidAmount: "Invalid amount"
    }
  },
  langs: {
    vi: {
      help: "Danh sách lệnh ngân hàng",
      success: "Thành công",
      error: "Lỗi",
      insufficientFunds: "Không đủ tiền",
      invalidAmount: "Số tiền không hợp lệ"
    },
    en: {
      help: "Banking commands list",
      success: "Success",
      error: "Error",
      insufficientFunds: "Insufficient funds",
      invalidAmount: "Invalid amount"
    }
  },

  onStart: async function ({ message, args, event, usersData, threadsData, getLang, api }) {
    const { senderID, threadID } = event;
    const command = args[0]?.toLowerCase();
    const API_BASE = 'https://shizubank.vercel.app';

    const userData = await usersData.get(senderID);
    const walletBalance = userData.money || 0;

    switch (command) {
      case "help":
      case undefined:
        return this.showHelp(message, usersData, senderID);

      case "balance":
      case "bal":
        return this.showBalance(message, senderID, usersData, API_BASE);

      case "deposit":
      case "dep":
        return this.deposit(message, args, userData, usersData, senderID, API_BASE);
      case "withdraw":
      case "wd":
        return this.withdraw(message, args, userData, usersData, senderID, API_BASE);

      case "interest":
        return this.collectInterest(message, senderID, API_BASE);

      case "leaderboard":
      case "top":
        return this.showLeaderboard(message, API_BASE, api);

      case "card":
        return this.handleCard(message, args, userData, usersData, senderID, API_BASE);

      case "stocks":
        return this.handleStocks(message, args, userData, usersData, senderID, API_BASE);

      case "crypto":
        return this.handleCrypto(message, args, userData, usersData, senderID, API_BASE);

      case "lottery":
        return this.handleLottery(message, args, userData, usersData, senderID, API_BASE);

      case "history":
      case "transactions":
        return this.showHistory(message, senderID, API_BASE);

      default:
        return message.reply(`🏦 ${title}\n\n❌ Unknown command. Use 'bank help' to see all commands.`);
    }
  },

  showHelp: async function (message, usersData, senderID) {
    const userData = await usersData.get(senderID);
    const userName = userData.name || "User";

    const helpText = `
🏦 ${title}
━━━━━━━━━━━━━
Hello ${userName}! Please choose your service:

💰 BASIC BANKING
• bank balance - Check account balance
• bank deposit <amount> - Deposit money to bank
• bank withdraw <amount> - Withdraw money from bank
• bank interest - Collect daily interest
• bank history - View transaction history
• bank leaderboard - View top users

💳 DEBIT CARD
• bank card create - Create debit card
• bank card deposit <amount> - Deposit to card
• bank card withdraw <amount> - Withdraw from card

📈 INVESTMENTS
• bank stocks list - View available stocks
• bank stocks buy <symbol> <shares> - Buy stocks
• bank stocks sell <symbol> <shares> - Sell stocks

₿ CRYPTOCURRENCY
• bank crypto list - View available crypto
• bank crypto buy <name> <amount> - Buy crypto
• bank crypto sell <name> <amount> - Sell crypto

🎰 LOTTERY
• bank lottery info - View lottery information
• bank lottery buy <number> - Buy lottery ticket (1-100)

━━━━━━━━━━━━━
Start with 'bank balance' to see your account!
`;
    return message.reply(helpText);
  },

  showBalance: async function (message, senderID, usersData, API_BASE) {
    try {
      const response = await fetch(`${API_BASE}/balance/${senderID}`);
      const data = await response.json();
      const userData = await usersData.get(senderID);
      const userName = userData.name || "User";

      if (data.success) {
        const balanceText = `
🏦 ${title}
━━━━━━━━━━━━━
Hello ${userName}! Please choose your service:

💳 YOUR ACCOUNT OVERVIEW

💰 LIQUID ASSETS
• Cash in Wallet: $${data.data.cash.toLocaleString()}
• Bank Account: $${data.data.bank.toLocaleString()}
• Debit Card: $${data.data.card.toLocaleString()}

📊 INVESTMENT PORTFOLIO
• Stock Holdings: $${data.data.stocks.toLocaleString()}
• Cryptocurrency: $${data.data.crypto.toLocaleString()}

💎 ACCOUNT SUMMARY
• Net Worth: $${data.data.totalAssets.toLocaleString()}
• Credit Score: ${data.data.creditScore}/850
• Lottery Tickets: ${data.data.lotteryTickets} active
• Account ID: ${data.data.userId}

💡 TIP: Diversify your portfolio with stocks and crypto!
`;
        return message.reply(balanceText);
      } else {
        return message.reply("❌ " + data.message);
      }
    } catch (error) {
      return message.reply("❌ Error fetching balance");
    }
  },

  deposit: async function (message, args, userData, usersData, senderID, API_BASE) {
    const amount = parseInt(args[1]);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return message.reply(`🏦 ${title}\n\n❌ Please enter a valid amount to deposit.`);
    }
    try {
      const balanceResponse = await fetch(`${API_BASE}/balance/${senderID}`);
      const balanceData = await balanceResponse.json();

      if (!balanceData.success) {
        return message.reply(`🏦 ${title}\n\n❌ Error accessing your bank account.`);
      }

      const currentUserData = await usersData.get(senderID);
      let userMoney = currentUserData.money || 0;
      const userName = currentUserData.name || "User";

      if (userMoney > Number.MAX_SAFE_INTEGER || userMoney < 0) {
        userMoney = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, userMoney));
        currentUserData.money = userMoney;
        await usersData.set(senderID, currentUserData);
      }

      if (userMoney < amount) {
        return message.reply(`🏦 ${title}\n\nHello ${userName}! Please choose your service:\n\n❌ Insufficient funds in your wallet. You have $${userMoney.toLocaleString()}, but need $${amount.toLocaleString()}`);
      }

      const response = await fetch(`${API_BASE}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: senderID, amount })
      });
      const data = await response.json();
      if (data.success) {
        const newMoney = Math.max(0, userMoney - amount);
        currentUserData.money = newMoney;
        await usersData.set(senderID, currentUserData);

        const bonusMessage = data.depositInterest > 0 ? 
          `\n💰 Bonus Interest: $${data.depositInterest.toLocaleString()}` : '';
        return message.reply(`🏦 ${title}\n\nHello ${userName}! Please choose your service:\n\n✅ ${data.message}${bonusMessage}\nWallet: $${newMoney.toLocaleString()} | Bank: $${data.newBank.toLocaleString()}`);
      } else {
        return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Deposit error:', error);
      return message.reply(`🏦 ${title}\n\n❌ Error processing deposit. Please try again.`);
    }
  },

  withdraw: async function (message, args, userData, usersData, senderID, API_BASE) {
    const amount = parseInt(args[1]);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return message.reply(`🏦 ${title}\n\n❌ Please enter a valid amount to withdraw.`);
    }

    try {
      const balanceResponse = await fetch(`${API_BASE}/balance/${senderID}`);
      const balanceData = await balanceResponse.json();

      if (!balanceData.success) {
        return message.reply(`🏦 ${title}\n\n❌ Error accessing your bank account.`);
    }
      const bankBalance = balanceData.data.bank;

      const gstAmount = Math.floor(amount * 0.02);
      const totalNeeded = amount + gstAmount;

      if (bankBalance < totalNeeded) {
        return message.reply(`🏦 ${title}\n\n❌ Insufficient bank balance. You have $${bankBalance.toLocaleString()} but need $${totalNeeded.toLocaleString()} (including $${gstAmount.toLocaleString()} GST)`);
      }

      const response = await fetch(`${API_BASE}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: senderID, amount })
      });
      const data = await response.json();

      if (data.success) {
        const currentUserData = await usersData.get(senderID);
        let currentMoney = currentUserData.money || 0;
        const userName = currentUserData.name || "User";

        if (currentMoney > Number.MAX_SAFE_INTEGER || currentMoney < 0) {
          currentMoney = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, currentMoney));
        }
        const newMoney = Math.min(Number.MAX_SAFE_INTEGER, currentMoney + amount);
        currentUserData.money = newMoney;
        await usersData.set(senderID, currentUserData);

        const gstMessage = data.gstAmount > 0 ? 
          `\n💸 GST Deducted: $${data.gstAmount.toLocaleString()}` : '';
        return message.reply(`🏦 ${title}\n\nHello ${userName}! Please choose your service:\n\n✅ ${data.message}${gstMessage}\nWallet: $${newMoney.toLocaleString()} | Bank: $${data.newBank.toLocaleString()}`);
      } else {
        return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      return message.reply(`🏦 ${title}\n\n❌ Error processing withdrawal. Please try again.`);
    }
  },

  collectInterest: async function (message, senderID, API_BASE) {
    try {
      const response = await fetch(`${API_BASE}/interest/collect/${senderID}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        return message.reply(`🏦 ${title}\n\n💰 Interest collected! Earned $${data.interest.toLocaleString()} after waiting ${data.hoursWaited} hours.\nNew bank balance: $${data.newBank.toLocaleString()}`);
      } else {
        return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
      }
    } catch (error) {
      return message.reply(`🏦 ${title}\n\n❌ Error collecting interest`);
    }
  },
  showLeaderboard: async function (message, API_BASE, api) {
    try {
      const response = await fetch(`${API_BASE}/leaderboard`);
      const data = await response.json();

      if (data.success) {
        let leaderboardText = `🏦 ${title}\n\n🏆 RICHEST PLAYERS LEADERBOARD\n━━━━━━━━━━\n\n`;

        const userIds = data.leaderboard.map(user => user.userId);
        let userInfos = {};

        try {
          if (api && userIds.length > 0) {
            userInfos = await api.getUserInfo(userIds);
          }
        } catch (error) {
          console.log("Could not fetch user names");
        }

        data.leaderboard.forEach((user, index) => {
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
          const userName = userInfos[user.userId] ? userInfos[user.userId].name : 'Unknown User';

          leaderboardText += `${medal} ${userName}\n`;
          leaderboardText += `   🆔 UID: ${user.userId}\n`;
          leaderboardText += `   📅 Joined: ${user.createdDate}\n`;
          leaderboardText += `   💎 Total Assets: $${user.totalAssets.toLocaleString()}\n`;
          leaderboardText += `   💰 Cash: $${user.cash.toLocaleString()}\n`;
          leaderboardText += `   🏦 Bank: $${user.bank.toLocaleString()}\n`;
          leaderboardText += `   💳 Card: $${user.card.toLocaleString()}\n`;
          leaderboardText += `   📈 Stocks: $${user.stocksValue.toLocaleString()}\n`;
          leaderboardText += `   ₿ Crypto: $${user.cryptoValue.toLocaleString()}\n`;
          leaderboardText += `   📊 Credit: ${user.creditScore}\n`;
          leaderboardText += `━━━━━━━━━━\n\n`;
        });
        leaderboardText += `💡 TIP: Invest in stocks and crypto to climb the rankings!`;

        return message.reply(leaderboardText);
      } else {
        return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
      }
    } catch (error) {
      return message.reply(`🏦 ${title}\n\n❌ Error fetching leaderboard`);
    }
  },

  handleCard: async function (message, args, userData, usersData, senderID, API_BASE) {
    const action = args[1]?.toLowerCase();
    const amount = parseInt(args[2]);

    if (action === "create") {
      try {
        const response = await fetch(`${API_BASE}/card/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID })
        });
        const data = await response.json();

        if (data.success) {
          return message.reply(`🏦 ${title}\n\n✅ Debit card created!\nCard Number: ${data.cardNumber}\nDaily Limit: $${data.dailyLimit.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error creating card`);
      }
    }

    if (action === "deposit") {
      if (!amount || amount <= 0) {
        return message.reply(`🏦 ${title}\n\n❌ Please enter a valid amount.`);
      }

      const currentUserData = await usersData.get(senderID);
      const userMoney = currentUserData.money || 0;
      if (userMoney < amount) {
        return message.reply(`🏦 ${title}\n\n❌ Insufficient wallet funds.`);
      }
      try {
        const response = await fetch(`${API_BASE}/card/deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID, amount })
        });
        const data = await response.json();

        if (data.success) {
          currentUserData.money = userMoney - amount;
          await usersData.set(senderID, currentUserData);

          return message.reply(`🏦 ${title}\n\n✅ Deposited $${amount.toLocaleString()} to card.\nCard Balance: $${data.newCardBalance.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error depositing to card`);
      }
    }

    if (action === "withdraw") {
      if (!amount || amount <= 0) {
        return message.reply(`🏦 ${title}\n\n❌ Please enter a valid amount.`);
      }

      try {
        const response = await fetch(`${API_BASE}/card/withdraw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID, amount })
        });
        const data = await response.json();

        if (data.success) {
          const currentUserData = await usersData.get(senderID);
          currentUserData.money = (currentUserData.money || 0) + amount;
          await usersData.set(senderID, currentUserData);

          return message.reply(`🏦 ${title}\n\n✅ Withdrew $${amount.toLocaleString()} from card.\nWallet: $${currentUserData.money.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error withdrawing from card`);
      }
    }
    return message.reply(`🏦 ${title}\n\n❌ Usage: bank card <create/deposit/withdraw> [amount]`);
  },

  handleStocks: async function (message, args, userData, usersData, senderID, API_BASE) {
    const action = args[1]?.toLowerCase();

    if (action === "list") {
      try {
        const response = await fetch(`${API_BASE}/stocks/list`);
        const data = await response.json();

        if (data.success) {
          let stockList = `🏦 ${title}\n\n📈 STOCK MARKET - HIGH EARNING POTENTIAL\n━━━━━━━━━━\n\n`;

          data.stocks.forEach(stock => {
            stockList += `${stock.trend} ${stock.symbol}: $${stock.price.toLocaleString()}\n`;
            stockList += `   💰 Earning Multiplier: ${stock.multiplier}x\n`;
            stockList += `   📊 Volatility: ${(stock.volatility * 100).toFixed(1)}%\n`;
            stockList += `   🎯 Potential: ${stock.multiplier > 2 ? 'HIGH' : stock.multiplier > 1.5 ? 'MEDIUM' : 'STABLE'}\n\n`;
          });

          stockList += `**💡 TIPS:**\n`;
          stockList += `• Higher multipliers = More profit potential\n`;
          stockList += `• Lower prices = Easy entry point\n`;
          stockList += `• Check trends before buying\n\n`;
          stockList += `**Usage:**\n`;
          stockList += `• bank stocks buy <symbol> <shares>\n`;
          stockList += `• bank stocks sell <symbol> <shares>`;
          return message.reply(stockList);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(fonts.bold("❌ Error fetching stocks"));
      }
    }

    const symbol = args[2]?.toUpperCase();
    const shares = parseInt(args[3]);

    if (action === "buy") {
      if (!symbol || !shares || shares <= 0) {
        return message.reply(`🏦 ${title}\n\n❌ Usage: bank stocks buy <symbol> <shares>`);
      }

      try {
        const response = await fetch(`${API_BASE}/stocks/buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID, symbol, shares })
        });
        const data = await response.json();

        if (data.success) {
          return message.reply(`🏦 ${title}\n\n✅ Bought ${data.shares} shares of ${data.symbol} for $${data.totalCost.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error buying stocks`);
      }
    }

    if (action === "sell") {
      if (!symbol || !shares || shares <= 0) {
        return message.reply(`🏦 ${title}\n\n❌ Usage: bank stocks sell <symbol> <shares>`);
      }
      try {
        const response = await fetch(`${API_BASE}/stocks/buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID, symbol, shares })
        });
        const data = await response.json();

        if (data.success) {
          return message.reply(`🏦 ${title}\n\n✅ Bought ${data.shares} shares of ${data.symbol} for $${data.totalCost.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error buying stocks`);
      }
    }

    if (action === "sell") {
      if (!symbol || !shares || shares <= 0) {
        return message.reply(`🏦 ${title}\n\n❌ Usage: bank stocks sell <symbol> <shares>`);
      }

      try {
        const response = await fetch(`${API_BASE}/stocks/sell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID, symbol, shares })
        });
        const data = await response.json();

        if (data.success) {
          return message.reply(`🏦 ${title}\n\n✅ Sold ${data.shares} shares of ${data.symbol} for $${data.totalValue.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error selling stocks`);
      }
    }

    return message.reply(`🏦 ${title}\n\n❌ Usage: bank stocks <list/buy/sell>`);
  },

  handleCrypto: async function (message, args, userData, usersData, senderID, API_BASE) {
    const action = args[1]?.toLowerCase();

    if (action === "list") {
      try {
        const response = await fetch(`${API_BASE}/crypto/list`);
        const data = await response.json();
        if (data.success) {
          let cryptoList = `🏦 ${title}\n\n₿ CRYPTOCURRENCY - MOON POTENTIAL\n━━━━━━━━━━\n\n`;

          data.cryptos.forEach(crypto => {
            cryptoList += `${crypto.trend} ${crypto.name.toUpperCase()} (${crypto.symbol}): $${crypto.price.toFixed(3)}\n`;
            cryptoList += `   🚀 Earning Multiplier: ${crypto.multiplier}x\n`;
            cryptoList += `   📊 Volatility: ${(crypto.volatility * 100).toFixed(1)}%\n`;
            cryptoList += `   🎯 Risk Level: ${crypto.multiplier > 2.5 ? 'EXTREME' : crypto.multiplier > 2 ? 'HIGH' : 'MEDIUM'}\n\n`;
          });

          cryptoList += `💡 CRYPTO TIPS:\n`;
          cryptoList += `• Higher multipliers = Higher risk/reward\n`;
          cryptoList += `• DOGE has extreme volatility for big gains\n`;
          cryptoList += `• Start small, reinvest profits\n\n`;
          cryptoList += `Usage:\n`;
          cryptoList += `• bank crypto buy <name> <amount>\n`;
          cryptoList += `• bank crypto sell <name> <amount>`;

          return message.reply(cryptoList);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(fonts.bold("❌ Error fetching crypto"));
      }
    }

    const cryptoName = args[2]?.toLowerCase();
    const amount = parseFloat(args[3]);

    if (action === "buy") {
      if (!cryptoName || !amount || amount <= 0) {
        return message.reply(`🏦 ${title}\n\n❌ Usage: bank crypto buy <name> <amount>`);
      }

      try {
        const response = await fetch(`${API_BASE}/crypto/buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID, cryptoName, amount })
        });
        const data = await response.json();
        if (data.success) {
          return message.reply(`🏦 ${title}\n\n✅ Bought ${data.amount} ${data.cryptoName.toUpperCase()} for $${data.totalCost.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error buying crypto`);
      }
    }

    if (action === "sell") {
      if (!cryptoName || !amount || amount <= 0) {
        return message.reply(`🏦 ${title}\n\n❌ Usage: bank crypto sell <name> <amount>`);
      }

      try {
        const response = await fetch(`${API_BASE}/crypto/sell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID, cryptoName, amount })
        });
        const data = await response.json();

        if (data.success) {
          return message.reply(`🏦 ${title}\n\n✅ Sold ${data.amount} ${data.cryptoName.toUpperCase()} for $${data.totalValue.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error selling crypto`);
      }
    }

    return message.reply(`🏦 ${title}\n\n❌ Usage: bank crypto <list/buy/sell>`);
  },

  handleLottery: async function (message, args, userData, usersData, senderID, API_BASE) {
    const action = args[1]?.toLowerCase();

    if (action === "info") {
      try {
        const response = await fetch(`${API_BASE}/lottery/info/${senderID}`);
        const data = await response.json();

        if (data.success) {
          const lotteryText = `🏦 ${title}
🎰 LOTTERY INFORMATION
━━━━━━━━━━

💰 Prize Pool: $${data.prizePool.toLocaleString()}
🎫 Ticket Price: $${data.ticketPrice.toLocaleString()}
🎟️ Your Tickets: ${data.userTickets}
⏰ Next Draw: ${data.nextDraw}

🎯 How to Play:
• Choose a number between 1-100
• Buy tickets with 'bank lottery buy <number>'
• Win if your number is drawn!

💡 TIP: Each ticket gives you a chance to win the prize pool!
`;
          return message.reply(lotteryText);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error fetching lottery info`);
      }
    }

    if (action === "buy") {
      const number = parseInt(args[2]);
      if (!number || number < 1 || number > 100) {
        return message.reply(`🏦 ${title}\n\n❌ Usage: bank lottery buy <number> (1-100)`);
      }

      try {
        const response = await fetch(`${API_BASE}/lottery/buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: senderID, number })
        });
        const data = await response.json();

        if (data.success) {
          const currentUserData = await usersData.get(senderID);
          currentUserData.money = (currentUserData.money || 0) - data.ticketPrice;
          await usersData.set(senderID, currentUserData);
          return message.reply(`🏦 ${title}\n\n🎫 Bought lottery ticket #${data.number} for $${data.ticketPrice.toLocaleString()}!\nPrize Pool: $${data.prizePool.toLocaleString()}`);
        } else {
          return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
        }
      } catch (error) {
        return message.reply(`🏦 ${title}\n\n❌ Error buying lottery ticket`);
      }
    }

    return message.reply(`🏦 ${title}\n\n❌ Usage: bank lottery <info/buy>`);
  },

  showHistory: async function (message, senderID, API_BASE) {
    try {
      const response = await fetch(`${API_BASE}/transactions/${senderID}?limit=10`);
      const data = await response.json();

      if (data.success) {
        let historyText = `🏦 ${title}\n\n📋 TRANSACTION HISTORY (Latest 10)\n━━━━━━━━━━\n\n`;

        if (data.transactions.length === 0) {
          historyText += `📭 **No transactions found**\n`;
          historyText += `Start banking to see your transaction history here!`;
        } else {
          data.transactions.forEach((tx, index) => {
            historyText += `${tx.icon} **${tx.description}**\n`;
            historyText += `   🕒 ${tx.timeAgo} (${tx.date})\n`;

            if (tx.type === 'stock_buy' || tx.type === 'stock_sell') {
              historyText += `   💹 ${tx.type === 'stock_buy' ? 'Investment' : 'Profit'}: $${tx.amount.toLocaleString()}\n`;
            } else if (tx.type === 'crypto_buy' || tx.type === 'crypto_sell') {
              historyText += `   ₿ ${tx.type === 'crypto_buy' ? 'Investment' : 'Profit'}: $${tx.amount.toLocaleString()}\n`;
            }
            historyText += `━━━━━━━━━━\n`;
          });

          historyText += `\n**📊 SUMMARY:**\n`;
          historyText += `• Total Transactions: ${data.totalTransactions}\n`;
          historyText += `• Showing: Latest ${data.transactions.length} transactions\n`;
          historyText += `\n**💡 TIP: Use 'bank balance' to see current portfolio value!**`;
        }

        return message.reply(historyText);
      } else {
        return message.reply(`🏦 ${title}\n\n❌ ${data.message}`);
      }
    } catch (error) {
      console.error('History error:', error);
      return message.reply(`🏦 ${title}\n\n❌ Error fetching transaction history`);
    }
  }
};