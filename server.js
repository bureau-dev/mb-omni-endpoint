import express from "express";
import fetch from "node-fetch";

const app = express();

app.use(express.text({ type: "*/*" }));

const BOT_TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;
const SECRET = process.env.MB_TRACK_SECRET;

app.get("/", (req, res) => {
  res.send("ok");
});

app.post("/mb-track", async (req, res) => {
  try {
    const data = JSON.parse(req.body || "{}");

    console.log("Incoming event:", data);

    if (!data.secret || data.secret !== SECRET) {
      console.log("Wrong secret");
      return res.status(204).end();
    }

    if (data.event !== "mb_download_click") {
      console.log("Event ignored:", data.event);
      return res.status(204).end();
    }

    const message =
`⬇️ Mockup Download
🧾 Template: ${data.template_name || ""}
📂 ID: ${data.template_id || ""}
📍 Page: ${data.page_path || ""}
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
    console.log("Error:", e);
    return res.status(204).end();
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});

