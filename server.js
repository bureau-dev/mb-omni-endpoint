import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "200kb" }));

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

const OMNISEND_KEY = process.env.OMNISEND_KEY;

if (!OMNISEND_KEY) {
  console.error("OMNISEND_KEY is missing");
  process.exit(1);
}

app.post("/mb-track", async (req, res) => {
  try {
    const { email, template, file_size, file_ext, page_url } = req.body || {};
    if (!email) return res.status(204).end();

    // створюємо / оновлюємо контакт
    await fetch("https://api.omnisend.com/v3/contacts", {
      method: "POST",
      headers: {
        "X-API-KEY": OMNISEND_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        identifiers: [{ type: "email", id: email }],
        channels: {
          email: { status: "subscribed" }
        }
      })
    });

    // створюємо event
    await fetch("https://api.omnisend.com/v3/events", {
      method: "POST",
      headers: {
        "X-API-KEY": OMNISEND_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Mockup Download",
        systemName: "mb_download_png",
        email,
        fields: { template, file_size, file_ext, page_url }
      })
    });

    return res.status(204).end();
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
});

app.get("/", (req, res) => res.send("ok"));

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

