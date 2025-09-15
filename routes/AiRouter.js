const { Router } = require("express");
const { AzureKeyCredential } = require("@azure/core-auth");
const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { authenticateToken } = require("../middleware/Auth");
const AiRouter = Router();

const endpoint = "https://models.github.ai/inference";
const model = "gpt-4o-mini";
const token = process.env.GITHUB_TOKEN;

const client = ModelClient(endpoint, new AzureKeyCredential(token));

AiRouter.post("/", authenticateToken, async (req, res) => {
  const { messages, tone } = req.body; 
  const toneValue = tone || "professional";

  console.log("🤖 AI request received", { userId: req.user.userId, tone: toneValue });
  console.log("📝 Incoming messages:", JSON.stringify(messages, null, 2));

  const systemPrompt = {
    role: "system",
    content: `You are an AI assistant specialized in writing, refining, and suggesting marketing emails and subject lines. Keep your responses clear, concise, and ${toneValue}.`
  };

  try {
    console.log("📡 Sending request to AI client...");
    const response = await client.path("/chat/completions").post({
      body: { messages: [systemPrompt, ...messages], model }
    });

    console.log("✅ AI response received, status:", response.status);

    if (isUnexpected(response)) {
      console.error("❌ Unexpected AI response:", response.body);
      throw response.body.error; 
    }

    const reply = response.body.choices?.[0]?.message?.content || null;
    console.log("📝 AI reply:", reply);

    if (!reply) {
      console.warn("⚠️ No reply returned by AI model");
      return res.status(500).json({ error: "AI returned no response" });
    }

    res.json({ reply });
  } catch (err) {
    console.error("❌ AI chat failed:", err.message || err);
    res.status(500).json({ error: "AI chat failed", details: err.message || err });
  }
});



module.exports = AiRouter;
