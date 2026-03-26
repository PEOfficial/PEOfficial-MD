// 📂 File: autoread.js
// ☠️ AutoRead Command - TAYYAB HELL-MD

let autoReadEnabled = false; // Default OFF

module.exports = async function autoread({ conn, m, args, reply }) {
  try {
    if (!args[0]) {
      return reply(
`╭〔 ⚙️ *AUTO-READ STATUS* 〕╮
┃ Current: ${autoReadEnabled ? "🟢 ON" : "🔴 OFF"}
┃ 
┃ 💡 Usage:
┃   .autoread on   → Enable
┃   .autoread off  → Disable
┃ 
┃ 💜 Powered by: Tayyab Exploits
╰━━━━━━━━━━━━━━━━━━━╯`
      );
    }

    const option = args[0].toLowerCase();

    if (option === "on") {
      autoReadEnabled = true;
      reply(
`〔 💫 *AUTO-READ ACTIVATED* 〕
┃ ☠️ Bot will now mark every
┃     incoming message as *READ*.
┃ 
┃ 💜 Powered by: 𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿 Exploits
╰━━━━━━━━━━━━━━━━━━`
      );
    } 
    else if (option === "off") {
      autoReadEnabled = false;
      reply(
`〔 🚫 *AUTO-READ DEACTIVATED* 〕
┃ ☠️ Bot will no longer mark
┃     messages as *READ*.
┃ 
┃ 💜 Powered by: Tayyab Exploits
╰━━━━━━━━━━━━━━━━━━━╯`
      );
    } 
    else {
      reply(
`〔 ❌ *INVALID OPTION* 〕
┃ 💡 Usage:
┃   .autoread on   → Enable
┃   .autoread off  → Disable
╰━━━━━━━━━━━━━━━━━━━╯`
      );
    }

  } catch (e) {
    console.error(e);
    reply(
`╭━━━〔 ⚠️ *ERROR* 〕━━━╮
┃ ${e.message}
╰━━━━━━━━━━━━━━━━━━━╯`
    );
  }
};

// 📌 Hook for index.js or handler.js
module.exports.checkAutoRead = async function (conn, m) {
  if (autoReadEnabled) {
    try {
      await conn.readMessages([m.key]);
    } catch (err) {
      console.error("AutoRead error:", err);
    }
  }
};