const express = require("express");
const nodemailer = require("nodemailer");
const {Router} = require("express");
const {PrismaClient} = require("@prisma/client");
const {authenticateToken} = require("../middleware/Auth");
const MailingRouter = Router();
const prisma = new PrismaClient();
const router = express.Router();

MailingRouter.post("/send", authenticateToken, async (req, res) => {
  const { to, subject, message } = req.body;
  
  if (!to || !Array.isArray(to) || to.length === 0) {
    return res.status(400).json({ error: "Recipients (to) must be a non-empty array" });
  }
  try {
   
    const transporter = nodemailer.createTransport({
      host: "in-v3.mailjet.com",
      port: 587,
      auth: {
        user: process.env.MAILJET_API_KEY,
        pass: process.env.MAILJET_SECRET_KEY,
      },
    });

     const results = [];
    for (const recipient of to) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: recipient,
          subject,
          text: message,
        });
        results.push({ recipient, status: "sent" });
      } catch (err) {
        results.push({ recipient, status: "failed", error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("Mailjet error:", err);
    res.status(500).json({ success: false, error: "Failed to send campaign emails" });
  }
});
    

module.exports = MailingRouter;
