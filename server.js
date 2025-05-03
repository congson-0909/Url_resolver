const express = require("express");
const puppeteer = require("puppeteer");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

async function tryHeadRequest(url) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "manual" });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      return response.headers.get("location");
    }
  } catch (e) {
    console.warn(`HEAD request failed for ${url}, fallback to Puppeteer`);
  }
  return null;
}

app.post("/resolve", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No URL provided" });

  try {
    // Thử HEAD trước (nhanh và nhẹ)
    const headRedirect = await tryHeadRequest(url);
    if (headRedirect) {
      return res.json({ original: url, resolved: headRedirect });
    }
    
    response = await fetch(url, { method: "GET", redirect: "manual" });
    location = response.headers.get("location");
    if (location) return location;

    // Nếu HEAD không hoạt động, dùng Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 60000,
      executablePath: process.env.CHROME_PATH || undefined,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const finalUrl = page.url();

    await browser.close();
    res.json({ original: url, resolved: finalUrl });
  } catch (error) {
    console.error("Error resolving URL:", error);
    res.status(500).json({ error: "Could not resolve URL" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL Resolver running on port ${PORT}`);
});