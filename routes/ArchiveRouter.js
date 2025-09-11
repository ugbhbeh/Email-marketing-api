const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/Auth");
const prisma = new PrismaClient();
const ArchiveRouter = Router();

// Create Draft
ArchiveRouter.post("/drafts", authenticateToken, async (req, res) => {
  const { subject, message, campaignId } = req.body;
  const userId = req.user.userId;

  try {
    const draft = await prisma.draft.create({
      data: { subject, message, campaignId, userId },
    });
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: "Failed to save draft" });
  }
});

// Get all Drafts
ArchiveRouter.get("/drafts", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const drafts = await prisma.draft.findMany({
      where: { userId },
      include: { campaign: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

// Get Single Draft
ArchiveRouter.get("/drafts/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const draft = await prisma.draft.findFirst({
      where: { id, userId },
      include: { campaign: true },
    });
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

// Delete Draft
ArchiveRouter.delete("/drafts/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const draft = await prisma.draft.findFirst({ where: { id, userId } });
    if (!draft) return res.status(404).json({ error: "Draft not found" });

    await prisma.draft.delete({ where: { id } });
    res.json({ message: "Draft deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

// Create Template
ArchiveRouter.post("/templates", authenticateToken, async (req, res) => {
  const { subject, message } = req.body;
  const userId = req.user.userId;

  try {
    const template = await prisma.template.create({
      data: { subject, message, userId },
    });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: "Failed to save template" });
  }
});

// Get all Templates
ArchiveRouter.get("/templates", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const templates = await prisma.template.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Get Single Template
ArchiveRouter.get("/templates/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const template = await prisma.template.findFirst({
      where: { id, userId },
    });
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// Delete Template
ArchiveRouter.delete("/templates/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const template = await prisma.template.findFirst({ where: { id, userId } });
    if (!template) return res.status(404).json({ error: "Template not found" });

    await prisma.template.delete({ where: { id } });
    res.json({ message: "Template deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete template" });
  }
});

module.exports = ArchiveRouter;
