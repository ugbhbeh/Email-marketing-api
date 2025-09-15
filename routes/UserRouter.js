const {Router} = require("express");
const {PrismaClient} = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const {authenticateToken} = require("../middleware/Auth");
const UserRouter = Router();
const prisma = new PrismaClient();


// Sign up
UserRouter.post('/', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    res.status(201).json({ user, debug: { email, hashedPassword: !!hashedPassword } });
  } catch (error) {
    res.status(400).json({ error: error.message, debug: { body: req.body, envSecret: !!process.env.JWT_SECRET } });
  }
});

// Guest login
UserRouter.post('/guest', async (req, res) => {
  try {
    const timestamp = Date.now();
    const guestEmail = `guest_${timestamp}@guest.local`;
    const password = `guest_${timestamp}@guest.local`;

    const guestUser = await prisma.user.create({
      data: { email: guestEmail, name: `Guest_${timestamp}`, password }
    });

    const token = jwt.sign({ userId: guestUser.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      userId: guestUser.id,
      debug: { guestEmail, envSecret: !!process.env.JWT_SECRET }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create guest user', debug: { message: err.message } });
  }
});

// Login
UserRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    let validPassword = false;
    if (user) {
      validPassword = await bcrypt.compare(password, user.password);
    }

    if (!user || !validPassword) {
      return res.status(401).json({
        error: "invalid credentials",
        debug: { email, userFound: !!user, passwordMatch: validPassword }
      });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET);

    res.json({
      token,
      userId: user.id,
      debug: { email, userFound: !!user, passwordMatch: validPassword, envSecret: !!process.env.JWT_SECRET }
    });
  } catch (error) {
    res.status(500).json({ error: error.message, debug: { body: req.body } });
  }
});

// Delete user account (protected)
UserRouter.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.userId !== req.params.id) {
      return res.status(403).json({ error: "access denied", debug: { userId: req.user.userId, targetId: req.params.id } });
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).json({ success: true, debug: { deletedId: req.params.id } });
  } catch (error) {
    res.status(400).json({ error: error.message, debug: { id: req.params.id } });
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




  
 module.exports = UserRouter;