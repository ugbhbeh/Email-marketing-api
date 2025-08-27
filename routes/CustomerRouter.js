const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/Auth");
const CustomerRouter = Router();
const prisma = new PrismaClient();


// Get all customers for a user

CustomerRouter.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const customers = await prisma.customer.findMany({
      where: { userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});


// Add customers with CSV

CustomerRouter.post("/csv", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { clients } = req.body;

  if (!Array.isArray(clients) || clients.length === 0) {
    return res.status(400).json({ error: "No clients provided" });
  }

  try {
    await prisma.customer.createMany({
      data: clients.map((client) => ({
        email: client.email,
        name: client.name || null,
        userId,
      })),
      skipDuplicates: true, 
    });

    const customers = await prisma.customer.findMany({
      where: { userId },
      select: { id: true, email: true, name: true },
    });

    res.status(200).json(customers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// Add a single customer manually

CustomerRouter.post("/single", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Customer email is required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const customer = await prisma.customer.upsert({
      where: { email_userId: { email, userId } },
      update: { name: name || null },
      create: { email, name: name || null, userId },
      select: { id: true, email: true, name: true },
    });

    res.status(200).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update customer info

CustomerRouter.put("/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;
  const { email, name } = req.body;

  try {
    const result = await prisma.customer.updateMany({
      where: { id, userId },
      data: { email, name },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Customer not found or not yours" });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });

    res.status(200).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// Delete customer

CustomerRouter.delete("/:id", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const result = await prisma.customer.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Customer not found or not yours" });
    }

    res.status(204).send(); 
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = CustomerRouter;
