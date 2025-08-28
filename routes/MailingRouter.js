const express = require("express");
const nodemailer = require("nodemailer");
const {Router} = require("express");
const {PrismaClient} = require("@prisma/client");
const {authenticateToken} = require("../middleware/Auth");
const MailingRouter = Router();
const prisma = new PrismaClient();


MailingRouter.post("/send", authenticateToken, async (req, res) => {
  const Id = req.user.userId;
  const { campaignId, subject, message } = req.body;
  
if (!campaignId || !subject || !message) {
    return res.status(400).json({ error: "campaignId, subject, and message are required" });
  }
    
   try {
    
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, Id },
      include: { customers: true },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found or not Authorized" });
    }

    if (campaign.customers.length === 0) {
      return res.status(400).json({ error: "No customers in this campaign" });
    }

    
    const transporter = nodemailer.createTransport({
      host: "in-v3.mailjet.com",
      port: 587,
      auth: {
        user: process.env.MAILJET_API_KEY,
        pass: process.env.MAILJET_SECRET_KEY,
      },
    });

    
    for (const customer of campaign.customers) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: customer.email,
        subject,
        text: message,
      });
    }

    res.json({ success: true, sent: campaign.customers.length });
  } catch (err) {
    console.error("Mailjet error:", err);
    res.status(500).json({ error: "Failed to send campaign emails" });
  }

});
    

module.exports = MailingRouter;
