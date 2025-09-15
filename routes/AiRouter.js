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

  const systemPrompt = {
    role: "system",
    content: `You are an AI assistant specialized in writing, refining, and suggesting marketing emails and subject lines. Keep your responses clear, concise, and ${toneValue}.`
  };

  try {
    if (!process.env.AZURE_OPENAI_KEY || !process.env.AZURE_OPENAI_ENDPOINT || !process.env.MODEL) {
      return res.status(500).json({
        error: "Missing Azure OpenAI configuration",
        debug: {
          AZURE_OPENAI_KEY: !!process.env.AZURE_OPENAI_KEY,
          AZURE_OPENAI_ENDPOINT: !!process.env.AZURE_OPENAI_ENDPOINT,
          MODEL: !!process.env.MODEL
        }
      });
    }

    const response = await client.path("/chat/completions").post({
      body: { messages: [systemPrompt, ...messages], model }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    res.json({
      reply: response.body.choices[0].message.content,
      debug: {
        messagesSent: messages.length,
        tone: toneValue,
        model: process.env.MODEL
      }
    });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ error: "AI chat failed", debug: { message: err.message } });
  }
});




module.exports = AiRouter;
