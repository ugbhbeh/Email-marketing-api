const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/Auth");
const CampaignRouter = Router();
const prisma = new PrismaClient();

// ----------------------------
// Get all campaigns for logged-in user
// ----------------------------
CampaignRouter.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(campaigns);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------
// Get details for a single campaign
// ----------------------------
CampaignRouter.get("/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        customers: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.status(200).json(campaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------
// Create a new campaign
// ----------------------------
CampaignRouter.post("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { name } = req.body;

  try {
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------
// Add existing customers to a campaign
// ----------------------------
CampaignRouter.post("/:id/customers", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id: campaignId } = req.params;
  const { customerIds } = req.body;

  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return res.status(400).json({ error: "No customer IDs provided" });
  }

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        customers: {
          connect: customerIds.map((id) => ({ id })),
        },
      },
      select: {
        id: true,
        name: true,
        customers: { select: { id: true, email: true, name: true } },
      },
    });

    res.status(200).json(updatedCampaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------
// Bulk import customers into a campaign via CSV
// ----------------------------
CampaignRouter.post("/:id/customers/csv", authenticateToken, async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.user.userId;
  const { clients } = req.body;

  if (!Array.isArray(clients) || clients.length === 0) {
    return res.status(400).json({ error: "No clients provided" });
  }

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found or not accessible" });
    }

    const connectOrCreateData = clients.map((client) => ({
      where: { email_userId: { email: client.email, userId } }, // composite unique
      create: { email: client.email, name: client.name, userId },
    }));

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        customers: {
          connectOrCreate: connectOrCreateData,
        },
      },
      select: {
        id: true,
        name: true,
        customers: { select: { id: true, email: true, name: true } },
      },
    });

    res.status(200).json(updatedCampaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------
// Remove a single customer from a campaign
// ----------------------------
CampaignRouter.delete("/:id/customers/:customerId", authenticateToken, async (req, res) => {
  const { id: campaignId, customerId } = req.params;
  const userId = req.user.userId;

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found or not accessible" });
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        customers: { disconnect: { id: customerId } },
      },
      select: {
        id: true,
        name: true,
        customers: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(200).json(updatedCampaign);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ----------------------------
// Delete a campaign
// ----------------------------
CampaignRouter.delete("/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const result = await prisma.campaign.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Campaign not found or not accessible" });
    }

    res.status(200).json({ message: "Campaign deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = CampaignRouter;
