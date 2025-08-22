const {Router} = require("express");
const {PrismaClient} = require("@prisma/client");
const {authenticateToken} = require("../middleware/Auth");
const CustomerRouter = Router();
const prisma = new PrismaClient();

// add csv of clients 

CustomerRouter.post("/csv", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { clients } = req.body;

  if (!Array.isArray(clients) || clients.length === 0) {
    return res.status(400).json({ error: "No clients provided" });
  }

  try {
    
    const result = await prisma.customer.createMany({
        data: clients.map((client) => ({
        email: client.email,
        name: client.name || null,
        userId, 
      })),
      skipDuplicates: true, 
    });

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
    res.status(400).json({ error: error.message });
  }
});

// add manual clients 

CustomerRouter.post("/single", authenticateToken, async(req, res) => {
     const userId = req.user.userId;
     const {email, name} = req.body;

     if(!email) {
        return res.status(400).json({ error: " Customer Email is required" })
     }

     try {
        const user = await prisma.user.findUnique({where: { id: userId }});
        if (!user) {
            return res.status(401).json({error: "User not found"});
        };

        const customer = await prisma.customer.upsert({
            where: {
                email_userId: { email, userId }, 
               },
            update: {
                name: name || null,
               },
            create: {
                email,
                name: name || null,
                userId,
               },
            select: {
                id: true,
                email: true,
                name: true,
               },
            });
     res.status(200).json(customer);

     }catch (error) {
        res.status(400).json({ error: error.message });
     }
} )

// update info for clients 

// delete clients from database