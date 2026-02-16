import express from "express";
import fetch from "node-fetch";

const app = express();

/* ========= CORS ========= */
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin === "https://mockupbureau.com") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.text({ type: "*/*", limit: "1mb" }));

/* ========= ENV ========= */
const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;
const SECRET = process.env.MB_TRACK_SECRET;

/* ========= HELPERS ========= */
function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "";
}

function countryCodeToFlag(code) {
  if (!code || code.length !== 2) return "";
  return code
    .toUpperCase()
    .split("")
    .map(c => String.fromCodePoint(127397 + c.charCodeAt()))
    .join("");
}

async function getCountryInfo(ip) {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) return { name: "Unknown", code: "" };

    const data = await response.json();
    return {
      name: data.country_name || "Unknown",
      code: data.country_code || ""
    };
  } catch {
    return { name: "Unknown", code: "" };
  }
}

/* ========= ROUTES ========= */
app.get("/", (req, res) => res.send("ok"));

app.post("/mb-track", async (req, res) => {
  try {
    const raw = req.body || "";
    const data = safeJsonParse(raw) || {};

    if (SECRET && data.secret !== SECRET) {
      return res.status(204).end();
    }

    if (data.event !== "mb_download_click") {
      return res.status(204).end();
    }

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(204).end();
    }

    const ip = getClientIp(req);
    const { name: countryName, code: countryCode } = await getCountryInfo(ip);
    const flag = countryCodeToFlag(countryCode);

    const templateName = data.template_name || "";
    const templateId = data.template_id || "";
    const pagePath = data.page_path || "";
    const email = data.email || "";

    const dateObj = new Date(data.ts || Date.now());

    const date = dateObj.toLocaleDateString("en-GB"); // 16/02/2026
    const time = dateObj.toLocaleTimeString("en-GB"); // 18:53:25

    const message =
`⬇️ Mockup Download

🧾 Template: ${templateName}
📂 ID: ${templateId}
📍 Page: ${pagePath}
📧 Email: ${email}

🌍 Country: ${flag} ${countryName}
🌐 IP: ${ip}

📅 Date: ${date}
⏰ Time: ${time}`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        disable_web_page_preview: true,
      }),
    });

    return res.status(204).end();
  } catch (e) {
    console.log("Error:", e);
    return res.status(204).end();
  }
});

/* ========= START ========= */
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port", process.env.PORT || 3000);
});



