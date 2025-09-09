const { Router } = require("express");
const { AzureKeyCredential } = require("@azure/core-auth");
const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { authenticateToken } = require("../middleware/Auth");
const AiRouter = Router();

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-5-mini";
const token = process.env.GITHUB_TOKEN;

const client = ModelClient(endpoint, new AzureKeyCredential(token));

AiRouter.post("/chat", authenticateToken, async (req, res) => {
  const { messages, tone } = req.body; 
   const tonevalue = tone || "professional"
  const systemPrompt = {
    role: "system",
    content: `You are an AI assistant specialized in writing, refining, and suggesting marketing emails and subject lines. Keep your responses clear, concise, and ${tonevalue}.`
  };

  try {
    const response = await client.path("/chat/completions").post({
      body: { messages: [systemPrompt, ...messages], model }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    res.json({ reply: response.body.choices[0].message.content });
  } catch (err) {
    console.error("AI request failed:", err);
    res.status(500).json({ error: "AI chat failed" });
  }
});


module.exports = AiRouter;
