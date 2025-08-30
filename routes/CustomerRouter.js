const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("../middleware/Auth");
const CustomerRouter = Router();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const prisma = new PrismaClient();
const upload = multer({ dest: "uploads/" });


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
CustomerRouter.post("/csv", authenticateToken, upload.single("file"), async (req, res) => {
  const userId = req.user.userId;

  if (!req.file) {
    return res.status(400).json({ error: "No CSV file uploaded" });
 
  }

  try {
    const customers = [];
    fs.createReadStream(req.file.path)
      .pipe(csv({
        skipEmptyLines: true,
      }))
      .on("data", (row) => {
        if (row.email) {
          customers.push({
            email: row.email.trim(),
            name: row.name?.trim() || null,
            userId
          });
        }
      })
      .on("end", async () => {
        fs.unlinkSync(req.file.path);

        if (customers.length === 0) {

          return res.status(400).json({ error: "No valid customers found in CSV" });
        }
        
        await prisma.customer.createMany({
          data: customers,
          skipDuplicates: true,
        });

        const allCustomers = await prisma.customer.findMany({
          where: { userId },
          select: { id: true, email: true, name: true },
        });
        res.status(200).json(allCustomers);
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
