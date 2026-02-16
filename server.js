import express from "express";
import fetch from "node-fetch";

const app = express();

/* ========= MIDDLEWARE ========= */

// Дозволяємо CORS (щоб fetch з сайту не падав)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // дозволь тільки твій сайт
  if (origin === "https://mockupbureau.com") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});


// Приймаємо beacon як text
app.use(express.text({ type: "*/*", limit: "1mb" }));

/* ========= ENV ========= */

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;
const SECRET = process.env.MB_TRACK_SECRET;

/* ========= ROUTES ========= */

app.get("/", (req, res) => {
  res.send("ok");
});

app.post("/mb-track", async (req, res) => {
  try {
    console.log("RAW BODY:", req.body);

    let data = {};
    try {
      data = JSON.parse(req.body || "{}");
    } catch (e) {
      console.log("JSON parse error");
      return res.status(204).end();
    }

    console.log("Incoming event:", data);

    // Перевірка secret
    if (!data.secret || data.secret !== SECRET) {
      console.log("Wrong secret");
      return res.status(204).end();
    }

    // Нас цікавить тільки download
    if (data.event !== "mb_download_click") {
      console.log("Event ignored:", data.event);
      return res.status(204).end();
    }

    if (!BOT_TOKEN || !CHAT_ID) {
      console.log("Missing TG_BOT_TOKEN or TG_CHAT_ID");
      return res.status(204).end();
    }

    const message =
`⬇️ Mockup Download
🧾 Template: ${data.template_name || ""}
📂 ID: ${data.template_id || ""}
📍 Page: ${data.page_path || ""}
📧 Email: ${data.email || ""}
🕒 ${new Date().toISOString()}`;

    const tg = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message
        })
      }
    );

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

