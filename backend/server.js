require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const { buildSystemPrompt, buildGeneralPrompt, buildPregnancyPrompt } = require("./systemPrompt");

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMERGENCY_KEYWORDS = [
  "fieber", "krampf", "bewusstlos", "atmet nicht", "atmet kaum",
  "blau", "blaue lippen", "blutung", "blutet", "notfall",
  "trinkt nicht", "trinkt seit", "schläft nicht mehr", "reagiert nicht",
  "fällt", "gestürzt", "verschluckt", "vergiftet",
  "gedanken", "nicht mehr leben", "mir schaden", "baby schaden",
];

const MENTAL_HEALTH_KEYWORDS = ["gedanken", "nicht mehr leben", "mir schaden", "baby schaden"];

app.post("/chat", async (req, res) => {
  const { messages, profile, memories, parents, parentMemories, pregnancyProfile, recentFeedings, recentSleeps, achievedMilestones, tryingMilestones } = req.body;

  if (!messages) {
    return res.status(400).json({ error: "messages are required" });
  }
  const isGeneral = !profile && !pregnancyProfile;
  const isPregnancy = !!pregnancyProfile;

  const lastContent = messages.at(-1)?.content?.toLowerCase() || "";
  const emergency = EMERGENCY_KEYWORDS.some((k) => lastContent.includes(k));

  if (emergency) {
    const isMentalHealth = MENTAL_HEALTH_KEYWORDS.some((k) => lastContent.includes(k));
    if (isMentalHealth) {
      return res.json({
        emergency: true,
        type: "mental_health",
        message: "Bitte ruf jetzt die Telefonseelsorge an: 0800 111 0 111 (kostenlos, 24h)",
      });
    }
    return res.json({
      emergency: true,
      type: "medical",
      message: "Bitte ruf sofort den Notruf 112 an.",
    });
  }

  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system: isGeneral
      ? buildGeneralPrompt()
      : isPregnancy
        ? buildPregnancyPrompt(pregnancyProfile, memories ?? [], parents ?? [], parentMemories ?? [])
        : buildSystemPrompt(profile, memories ?? [], parents ?? [], parentMemories ?? [], recentFeedings ?? [], recentSleeps ?? [], achievedMilestones ?? [], tryingMilestones ?? []),
    messages: anthropicMessages,
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  res.json({ reply: text });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mia Backend läuft auf http://localhost:${PORT}`);
});
