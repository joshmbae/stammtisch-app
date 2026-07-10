require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const { buildGeneralPrompt, buildMemberPrompt } = require("./systemPrompt");

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

const APP_SHARED_SECRET = process.env.APP_SHARED_SECRET;

app.use((req, res, next) => {
  if (!APP_SHARED_SECRET) return next();
  if (req.get("x-app-secret") !== APP_SHARED_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

app.post("/chat", async (req, res) => {
  const { messages, member, erinnerungen, alleMitglieder, verordnung, protokolle } = req.body;

  if (!messages) {
    return res.status(400).json({ error: "messages are required" });
  }

  const isGeneral = !member;

  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const systemPrompt = isGeneral
    ? buildGeneralPrompt(verordnung, protokolle ?? [])
    : buildMemberPrompt(member, erinnerungen ?? [], alleMitglieder ?? [], verordnung, protokolle ?? []);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: systemPrompt,
    messages: anthropicMessages,
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  res.json({ reply: text });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Stammtisch-Backend (Sepp) läuft auf http://localhost:${PORT}`);
});
