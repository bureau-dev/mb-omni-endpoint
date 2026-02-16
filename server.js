import express from "express";
import fetch from "node-fetch";

const app = express();

/* ========= CORS (щоб не було конфліктів з credentials) ========= */
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Дозволяємо тільки твій домен (інакше '*' + credentials може ламати preflight)
  if (origin === "https://mockupbureau.com") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// Beacon часто шле як text/plain або application/json — приймаємо все як текст
app.use(express.text({ type: "*/*", limit: "1mb" }));

/* ========= ENV ========= */
const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;
const SECRET = process.env.MB_TRACK_SECRET;

/* ========= ROUTES ========= */
app.get("/", (req, res) => res.send("ok"));

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    // x-forwarded-for може бути "ip1, ip2, ip3"
    return xff.split(",")[0].trim();
  }
  // fallback
  return req.socket?.remoteAddress || "";
}

app.post("/mb-track", async (req, res) => {
  try {
    const raw = req.body || "";
    const data = safeJsonParse(raw) || {};

    // Логи (можеш прибрати, коли все стабільно)
    console.log("Incoming event:", data?.event);
    // console.log("DATA:", data);

    // IP + UA
    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "";

    // Перевірка секрету
    if (SECRET && data.secret !== SECRET) {
      console.log("Wrong secret");
      return res.status(204).end();
    }

    // Фільтр: тільки завантаження
    if (data.event !== "mb_download_click") {
      return res.status(204).end();
    }

    if (!BOT_TOKEN || !CHAT_ID) {
      console.log("Missing TG_BOT_TOKEN or TG_CHAT_ID");
      return res.status(204).end();
    }

    // Підхоплюємо поля (на випадок різних ключів)
    const templateName = data.template_name || data.templateName || "";
    const templateId = data.template_id || data.templateId || "";
    const pagePath = data.page_path || data.pagePath || "";
    const email = data.email || data.user_email || data.userEmail || "";
    const ts = new Date(data.ts || Date.now()).toISOString();

    const message =
`⬇️ Mockup Download
🧾 Template: ${templateName}
📂 ID: ${templateId}
📍 Page: ${pagePath}
📧 Email: ${email}
🌍 IP: ${ip}
🖥 UA: ${userAgent}
🕒 ${ts}`;

    const tg = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        disable_web_page_preview: true,
      }),
    });

    const tgText = await tg.text();
    console.log("Telegram response:", tg.status, tgText);

    return res.status(204).end();
  } catch (e) {
    console.log("Server error:", e);
    return res.status(204).end();
  }
});

/* ========= START ========= */
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port", process.env.PORT || 3000);
});


