const express = require("express");
const nodemailer = require("nodemailer");
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/Auth");

const MailingRouter = Router();
const prisma = new PrismaClient();

MailingRouter.post("/send", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { campaignId, subject, message, html } = req.body; 

  if (!campaignId || !subject || !message) {
    console.log("information not received fully");
    return res.status(400).json({ error: "campaignId, subject, and message are required" });
  }

  try {
      const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,     
        userId: userId      
      },
      include: {
        customers: true
      }
    });

    if (!campaign) {
      console.log("Campaign not found or not Authorized");
      return res.status(404).json({ error: "Campaign not found or not Authorized" });
    }

    if (campaign.customers.length === 0) {
      console.log("No customers in this campaign");
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

    await Promise.all(
      campaign.customers.map((customer) =>
        transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: customer.email,
          subject,
          text: message,
          html: html || `<p>${message}</p>`, 
        })
      )
    );

    console.log("Campaign sent");
    res.json({ success: true, sent: campaign.customers.length });

  } catch (err) {
    console.error("Mailjet error:", err);
    res.status(500).json({ error: "Failed to send campaign emails" });
  }
});

module.exports = MailingRouter;
