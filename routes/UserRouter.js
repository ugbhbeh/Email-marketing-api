const {Router} = require("express");
const {PrismaClient} = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const {authenticateToken} = require("../middleware/Auth");
const UserRouter = Router();
const prisma = new PrismaClient();

// Sign up
UserRouter.post('/', async (req, res) => {
    console.log("📩 Signup route hit");
    console.log("➡️ Request body:", req.body);

    try {
        const {email, name, password} = req.body;

        if (!email || !name || !password) {
            console.warn("⚠️ Missing fields:", { email, name, password });
            return res.status(400).json({ error: "All fields are required" });
        }

        console.log("🔒 Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);  

        console.log("🛠 Creating user in DB...");
        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            }
        });

        console.log("✅ User created successfully:", user);
        res.status(201).json(user);
    } catch (error) {
        console.error("❌ Signup error:", error);
        res.status(400).json({ error: error.message });
    }
});

// guest route
UserRouter.post('/guest', async (req, res) => {
  try {
    const timestamp = Date.now();
    const guestEmail = `guest_${timestamp}@guest.local`;
    const password = `guest_${timestamp}@guest.local`;

    const guestUser = await prisma.user.create({
      data: {
        email: guestEmail,
        name: `Guest_${timestamp}`,
        password: password
      }
    });

    const token = jwt.sign({ userId: guestUser.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      userId: guestUser.id
      
    });
  } catch (err) {
    console.error('Guest login error:', err);
    res.status(500).json({ error: 'Failed to create guest user' });
  }
});

// Login
UserRouter.post('/login', async (req, res) => {
    console.log("📩 Login route hit");
    console.log("➡️ Request body:", req.body);

    try { 
        const {email, password} = req.body;

        if (!email || !password) {
            console.warn("⚠️ Missing login fields:", { email, password });
            return res.status(400).json({ error: "All fields are required" });
        }

        console.log("🔍 Looking up user by email:", email);
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.warn("❌ No user found with email:", email);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("🔒 Comparing passwords...");
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            console.warn("❌ Invalid password for email:", email);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log("🔑 Signing JWT...");
        const token = jwt.sign(
            {
                userId: user.id, 
                email: user.email
            },
            process.env.JWT_SECRET,
        );

        console.log("✅ Login successful for user:", user.id);
        res.json({ token, userId: user.id });
    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: error.message });
    }
});

// profile route
UserRouter.get("/profile", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: {id: userId},
      include: {
        campaigns: true,
        customers: true,
      },
    });

    if (!user) return res.status(404).json({error: "user not found in database"})
    
    const totalSent = await prisma.mailLog.count({where: { userId}});
    const successCount = await prisma.mailLog.count({where: {userId, status:"SENT"}});
    const failureCount = await prisma.mailLog.count({where: {userId, status:"FAILED"}})

    const recentMails = await prisma.mailLog.findMany({
      where: {userId},
      orderBy: {sentAt: "desc"},
      take: 5,
      include: {customer: true, campaign: true}
    });

    res.json({
      ...user,
      stats: {
        campaigns: user.campaigns.length,
        customers: user.customers.length,
        totalSent,
        successCount,
        failureCount,
        recentMails
      }
    })
 
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete user account (protected)
UserRouter.delete('/:id', authenticateToken, async (req, res) => {
    console.log("🗑️ Delete user route hit");
    console.log("➡️ Authenticated userId:", req.user?.userId);
    console.log("➡️ Requested delete userId:", req.params.id);

    try {
        if (String(req.user.userId) !== String(req.params.id)) {
            console.warn("❌ Access denied: user mismatch", {
                authenticatedUserId: req.user.userId,
                requestedUserId: req.params.id
            });
            return res.status(403).json({ error: "Access denied" });
        }

        console.log("🔍 Attempting to delete user with ID:", req.params.id);
        await prisma.user.delete({
            where: { id: req.params.id }
        });

        console.log("✅ User deleted successfully:", req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        res.status(400).json({ error: error.message });
    }
});



  
 module.exports = UserRouter;