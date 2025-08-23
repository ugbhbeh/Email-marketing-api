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

  try {
   
    const transporter = nodemailer.createTransport({
      host: "in-v3.mailjet.com",
      port: 587,
      auth: {
        user: process.env.MAILJET_API_KEY,
        pass: process.env.MAILJET_SECRET_KEY,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: message,
    });

    res.json({ success: true, msg: "Email sent via Mailjet" });
  } catch (err) {
    console.error("Mailjet error:", err);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

module.exports = MailingRouter;
