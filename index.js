const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require('dotenv')
dotenv.config();

const UserRouter = require("./routes/UserRouter.js");
const CampaignRouter = require("./routes/CampaignRouter.js");
const CustomerRouter = require("./routes/CustomerRouter.js");
const MailingRouter = require("./routes/MailingRouter.js");
const AiRouter = require("./routes/AiRouter.js")
const ArchiveRouter = require("./routes/ArchiveRouter.js")
const app = express();
const httpServer = http.createServer(app);
const port = 8080;

app.use(cors({
  origin: "https://email-marketing-ui.onrender.com",
  credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/users", UserRouter); 
app.use("/campaigns", CampaignRouter)
app.use("/customers", CustomerRouter)
app.use("/mails", MailingRouter)
app.use("/ai", AiRouter )
app.use("/archive", ArchiveRouter )
app.get("/debug-env", (req, res) => {
  res.json({
    DATABASE_URL: !!process.env.DATABASE_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    MAILJET_API_KEY: !!process.env.MAILJET_API_KEY,
    MAILJET_SECRET_KEY: !!process.env.MAILJET_SECRET_KEY,
    EMAIL_FROM: !!process.env.EMAIL_FROM,
    AZURE_OPENAI_KEY: !!process.env.AZURE_OPENAI_KEY,
    AZURE_OPENAI_ENDPOINT: !!process.env.AZURE_OPENAI_ENDPOINT,
    MODEL: !!process.env.MODEL,
  });
});


httpServer.listen(port, () => {
  console.log(`Server launched on port ${port}`);
});