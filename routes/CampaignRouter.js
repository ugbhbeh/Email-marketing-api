const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/Auth");
const CampaignRouter = Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs")
const prisma = new PrismaClient();
const upload = multer({ dest: "uploads/" });

// Get all campaigns for a user

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

// Get campaign by id with details 

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

    const sent = await prisma.mailLog.count({ where: { userId, campaignId: id } });
    const success = await prisma.mailLog.count({ where: { userId, campaignId: id, status: "SENT" } });
    const failed = await prisma.mailLog.count({ where: { userId, campaignId: id, status: "FAILED" } });
    
    const uniqueCustomers = await prisma.mailLog.findMany({
      where: { campaignId },
      select: { customerId: true },
      distinct: ['customerId'],
     });
    const uniqueCount = uniqueCustomers.length;

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.status(200).json(campaign, sent, success,failed, uniqueCount);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//  new campaign

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

// Add  customers to campaign manually

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

// Bulk import customers from CSV
CampaignRouter.post("/:id/customers/csv", authenticateToken, upload.single("file"), async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.user.userId;

  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
  }

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found or not accessible" });
    }

    const customers = [];

   fs.createReadStream(req.file.path)
  .pipe(csv({
    headers: ["email", "name"],  
    skipEmptyLines: true,
    mapHeaders: ({ header }) => header.trim().toLowerCase()
  }))
  .on("data", (row) => {
    if (row.email) {
      customers.push({
        email: row.email.trim(),
        name: row.name?.trim() || null,
      });
    }
  })
      .on("end", async () => {
        
        fs.unlinkSync(req.file.path);

        if (customers.length === 0) {
          return res.status(400).json({ error: "No valid customers found in CSV" });
        }

        const connectOrCreateData = customers.map((c) => ({
          where: { email_userId: { email: c.email, userId } },
          create: { email: c.email, name: c.name, userId },
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
      })
      .on("error", (err) => {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ error: "CSV parsing failed", details: err.message });
      });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path); 
    res.status(400).json({ error: error.message });
  }
});


// Remove a single customer 

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


// Delete campaign

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
