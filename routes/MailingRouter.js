const nodemailer = require("nodemailer");
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/Auth");

const MailingRouter = Router();
const prisma = new PrismaClient();

// Send campaign mails
MailingRouter.post("/send", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { campaignId, subject, message, html } = req.body;

  console.log("📨 Send mail request received", { userId, campaignId, subject });

  if (!campaignId || !subject || !message) {
    console.warn("⚠️ Missing fields", { campaignId, subject, message });
    return res.status(400).json({ error: "campaignId, subject, and message are required" });
  }

  try {
    console.log("🔍 Fetching campaign with ID:", campaignId);
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: { customers: true }
    });

    if (!campaign) {
      console.warn("❌ Campaign not found or unauthorized", { userId, campaignId });
      return res.status(404).json({ error: "Campaign not found or not Authorized" });
    }

    if (campaign.customers.length === 0) {
      console.warn("⚠️ Campaign has no customers", { campaignId });
      return res.status(400).json({ error: "No customers in this campaign" });
    }

    console.log("📧 Setting up transporter");
    const transporter = nodemailer.createTransport({
      host: "in-v3.mailjet.com",
      port: 587,
      auth: {
        user: process.env.MAILJET_API_KEY,
        pass: process.env.MAILJET_SECRET_KEY,
      },
    });

    console.log(`➡️ Sending emails to ${campaign.customers.length} customers`);
    await Promise.all(
      campaign.customers.map(async (customer) => {
        try {
          console.log("✉️ Sending mail to:", customer.email);
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: customer.email,
            subject,
            text: message,
            html: html || `<p>${message}</p>`,
          });

          console.log("✅ Mail sent successfully to:", customer.email);
          await prisma.mailLog.create({
            data: {
              subject,
              message,
              userId,
              campaignId,
              customerId: customer.id,
              status: "SENT",
            },
          });
        } catch (err) {
          console.error("❌ Failed to send mail to:", customer.email, err.message);
          await prisma.mailLog.create({
            data: {
              subject,
              message,
              userId,
              campaignId,
              customerId: customer.id,
              status: "FAILED",
              error: err.message,
            },
          });
        }
      })
    );

    console.log("✅ Campaign completed");
    res.json({ success: true, sent: campaign.customers.length });
  } catch (err) {
    console.error("❌ Mailjet error:", err);
    res.status(500).json({ error: "Failed to send campaign emails" });
  }
});

// Get mail details
MailingRouter.get("/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const mailId = req.params.id;

  console.log("📥 Fetching mail details", { userId, mailId });

  try {
    const mail = await prisma.mailLog.findFirst({
      where: { id: mailId, userId },
      include: {
        campaign: true,
        customer: true, 
      },
    });

    if (!mail) {
      console.warn("❌ Mail not found", { userId, mailId });
      return res.status(404).json({ error: "Mail not found" });
    }

    console.log("✅ Mail details fetched", { mailId });
    res.json(mail);
  } catch (err) {
    console.error("❌ Failed to fetch mail details", err.message);
    res.status(500).json({ error: "Failed to fetch mail details" });
  }
});


module.exports = MailingRouter;
