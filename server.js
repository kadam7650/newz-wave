const crypto = require("node:crypto");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || process.env.NEWS_API_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const publishedArticles = [];

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const articleSchema = new mongoose.Schema({
  title: String,
  category: String,
  excerpt: String,
  author: String,
  date: String
}, { timestamps: true });

const Article = mongoose.model("Article", articleSchema);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Newz Wave backend is running", liveNewsConfigured: Boolean(GNEWS_API_KEY) });
});

app.get("/api/news", async (req, res) => {
  if (!GNEWS_API_KEY) return res.json({ source: "demo", articles: [] });

  const category = String(req.query.category || "");
  const query = String(req.query.q || "").trim();
  const categoryMap = { India: "nation", World: "world", Technology: "technology", Sports: "sports", Business: "business", Entertainment: "entertainment" };
  const params = new URLSearchParams({ lang: "en", max: "10", apikey: GNEWS_API_KEY });
  let endpoint = "https://gnews.io/api/v4/top-headlines";
  if (query) {
    endpoint = "https://gnews.io/api/v4/search";
    params.set("q", query);
  } else if (category === "India") {
    params.set("country", "in");
    params.set("category", "nation");
  } else if (category && categoryMap[category]) {
    params.set("category", categoryMap[category]);
  }

  try {
    const response = await fetch(`${endpoint}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return res.status(response.status).json({ message: "The news provider could not return headlines." });
    const data = await response.json();
    const results = (data.articles || []).map((item) => ({
      title: item.title,
      category: category || "World",
      excerpt: item.description || item.content || "Open the original report for details.",
      author: item.source?.name || "News desk",
      date: item.publishedAt ? new Date(item.publishedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Latest",
      url: item.url,
      image: item.image || ""
    }));
    res.set("Cache-Control", "public, max-age=120");
    res.json({ source: "gnews", articles: results });
  } catch (error) {
    res.status(502).json({ message: "Live headlines are temporarily unavailable." });
  }
});

app.get("/api/articles", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json(publishedArticles);
    const articles = await Article.find().sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/articles", async (req, res) => {
  if (!ADMIN_API_KEY) return res.status(503).json({ message: "Admin publishing is disabled until ADMIN_API_KEY is configured." });
  const suppliedKey = Buffer.from(req.get("x-admin-key") || "");
  const expectedKey = Buffer.from(ADMIN_API_KEY);
  if (suppliedKey.length !== expectedKey.length || !crypto.timingSafeEqual(suppliedKey, expectedKey)) {
    return res.status(401).json({ message: "Admin key is invalid." });
  }

  try {
    const { title, category, excerpt, author, date } = req.body;
    if (![title, category, excerpt, author].every((value) => typeof value === "string" && value.trim())) {
      return res.status(400).json({ message: "Title, category, summary, and author are required." });
    }
    const payload = { title: title.trim(), category, excerpt: excerpt.trim(), author: author.trim(), date: date || new Date().toLocaleDateString() };
    if (mongoose.connection.readyState !== 1) {
      const article = { ...payload, id: `${Date.now()}` };
      publishedArticles.unshift(article);
      return res.status(201).json(article);
    }
    const article = new Article(payload);
    await article.save();
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

async function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/newzwave";
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.log("MongoDB not available, continuing in fallback mode:", error.message);
  }
}

startServer();
