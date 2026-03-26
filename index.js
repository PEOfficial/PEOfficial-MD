const fs = require("fs");
const readline = require("readline");
const P = require("pino");
const { 
  default: makeWASocket, 
  useSingleFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason 
} = require("@whiskeysockets/baileys");

const { handleCommand } = require("./menu/case");
const { loadSettings } = require("./settings");
const { storeMessage, handleMessageRevocation } = require("./antidelete");
const AntiLinkKick = require("./antilinkkick.js");

// Persistent session path for Render
const sessionPath = "/mnt/data/session.json";
const { state, saveState } = useSingleFileAuthState(sessionPath);

// Readline for pairing
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: P({ level: "fatal" }) });

  // Load settings
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};
  let ownerRaw = settings.ownerNumber?.[0] || "92300xxxxxxx";
  const ownerJid = ownerRaw.includes("@s.whatsapp.net") ? ownerRaw : ownerRaw + "@s.whatsapp.net";

  // Global flags
  global.sock = sock;
  global.settings = settings;
  global.signature = settings.signature || "> 𝑃𝐸𝑂𝐹𝐹𝐼𝐶𝐼𝐴𝐿 ❦ ✓";
  global.owner = ownerJid;
  global.ownerNumber = ownerRaw;
  global.antilink = {};
  global.antilinkick = {};
  global.autogreet = {};
  global.autotyping = false;
  global.autoreact = false;
  global.autostatus = false;

  console.log("✅ BOT OWNER:", global.owner);

  // Save session automatically
  sock.ev.on("creds.update", saveState);

  // Connection handling
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ [BOT ONLINE] Connected to WhatsApp!");
      rl.close();
    }
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
      console.log("❌ Disconnected. Reconnecting:", shouldReconnect);
      if (shouldReconnect) startBot();
    }
  });

  // Message handling
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

    // AntiDelete
    if (settings.ANTIDELETE) {
      try {
        if (msg.message) storeMessage(msg);
        if (msg.message?.protocolMessage?.type === 0) await handleMessageRevocation(sock, msg);
      } catch (err) {
        console.error("❌ AntiDelete Error:", err.message);
      }
    }

    // AutoTyping
    if (global.autotyping && jid !== "status@broadcast") {
      try {
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(res => setTimeout(res, 2000));
      } catch (err) {
        console.error("❌ AutoTyping Error:", err.message);
      }
    }

    // AutoReact
    if (global.autoreact && jid !== "status@broadcast") {
      try {
        const hearts = ["❤️","☣️","🅣","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💕"];
        const randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
        await sock.sendMessage(jid, { react: { text: randomHeart, key: msg.key } });
      } catch (err) {
        console.error("❌ AutoReact Error:", err.message);
      }
    }

    // AutoStatus
    if (global.autostatus && jid === "status@broadcast") {
      try {
        await sock.readMessages([{ remoteJid: jid, id: msg.key.id, participant: msg.key.participant || msg.participant }]);
        console.log(`👁️ Status Seen: ${msg.key.participant || "Unknown"}`);
      } catch (err) {
        console.error("❌ AutoStatus Error:", err.message);
      }
      return;
    }

    // Antilink
    if (jid.endsWith("@g.us") && global.antilink[jid] && /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) && !msg.key.fromMe) {
      try { await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: msg.key.participant || msg.participant } }); } catch (err) { console.error("❌ Antilink Delete Error:", err.message); }
    }

    // AntilinkKick
    if (jid.endsWith("@g.us") && global.antilinkick[jid] && /(chat\.whatsapp\.com|t\.me|discord\.gg|wa\.me|bit\.ly|youtu\.be|https?:\/\/)/i.test(text) && !msg.key.fromMe) {
      try { await AntiLinkKick.checkAntilinkKick({ conn: sock, m: msg }); } catch (err) { console.error("❌ AntilinkKick Error:", err.message); }
    }

    // Pass to command handler
    handleCommand(sock, msg);
  });

  // AutoGreet
  sock.ev.on("group-participants.update", async (update) => {
    const { id, participants, action } = update;
    if (!global.autogreet[id]) return;

    try {
      const metadata = await sock.groupMetadata(id);
      const memberCount = metadata.participants.length;
      const groupName = metadata.subject || "Unnamed Group";

      for (const user of participants) {
        const tag = `@${user.split("@")[0]}`;
        let message = "";
        if (action === "add") message = `👋 Welcome ${tag} to ${groupName} ⚡ Members: ${memberCount}`;
        else if (action === "remove") message = `💔 ${tag} left ${groupName} ⚡ Members: ${memberCount - 1}`;
        if (message) await sock.sendMessage(id, { text: message, mentions: [user] });
      }
    } catch (err) {
      console.error("❌ AutoGreet Error:", err.message);
    }
  });

  // Pairing code (for first-time login)
  if (!state.creds?.registered) {
    const phoneNumber = await question("📱 Enter your WhatsApp number (with country code): ");
    await sock.requestPairingCode(phoneNumber.trim());

    setTimeout(() => {  
      const code = sock.authState.creds?.pairingCode;  
      if (code) {  
        console.log("\n🔗 Pair this device using this code in WhatsApp:\n");
        console.log("   " + code + "\n");
        console.log("Go to WhatsApp → Linked Devices → Link with code.");  
      } else {  
        console.log("❌ Pairing code not found.");  
      }  
    }, 1000);
  }
}

startBot();