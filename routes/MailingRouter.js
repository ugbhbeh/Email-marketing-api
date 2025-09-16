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
    return res.status(400).json({ error: "campaignId, subject, and message are required"});
  }

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: { customers: true }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found or not Authorized", debug: { campaignId, userId } });
    }

    if (campaign.customers.length === 0) {
      return res.status(400).json({ error: "No customers in this campaign", debug: { campaignId } });
    }

    const transporter = nodemailer.createTransport({
      host: "in-v3.mailjet.com",
      port: 587,
      auth: {
        user: process.env.MAILJET_API_KEY,
        pass: process.env.MAILJET_SECRET_KEY,
      },
    });

    let results = [];
    for (const customer of campaign.customers) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: customer.email,
          subject,
          text: message,
          html: html || `<p>${message}</p>`,
        });

        await prisma.mailLog.create({
          data: { subject, message, userId, campaignId, customerId: customer.id, status: "SENT" },
        });

        results.push({ email: customer.email, status: "SENT" });
      } catch (err) {
        await prisma.mailLog.create({
          data: { subject, message, userId, campaignId, customerId: customer.id, status: "FAILED", error: err.message },
        });
        results.push({ email: customer.email, status: "FAILED", error: err.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: "Failed to send campaign emails" });
  }
});

// Get mail details
MailingRouter.get("/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const mailId = req.params.id;

  try {
    const mail = await prisma.mailLog.findFirst({
      where: { id: mailId, userId },
      include: {
        campaign: true,
        customer: true, 
      },
    });

    if (!mail) {
      return res.status(404).json({ error: "Mail not found" });
    }

    res.json(mail);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch mail details" });
  }
});


module.exports = MailingRouter;
