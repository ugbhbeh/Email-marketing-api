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
        const {email, username, password} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);  
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true,
            }
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({error: error.message});
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
        username: `Guest_${timestamp}`,
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
    try { 
        const {email, password} = req.body;
        const user = await prisma.user.findUnique({where: {email}});

        if (!user) {
            return res.status(401).json({error: "invalid credentials"});
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if(!validPassword) {
            return res.status(401).json({error:"invalid credentials"});
        }

        const token = jwt.sign(
            {
                userId: user.id, 
                email: user.email
            },
            process.env.JWT_SECRET,
        );

        res.json({token, userId: user.id });
    } catch (error) {
        res.status(500).json({error: error.message});
    }

});

// gets the user profile

UserRouter.get("/profile", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

   if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        campaigns: {
          include: {
            customers: true,
          },
        },
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete user account (protected)
 UserRouter.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.userId !== req.params.id){
            return res.status(403).json({error: "access denied"});
       }

       await prisma.user.delete({
        where: {id: req.params.id}
       });
        res.status(204).send();
       } catch (error) {
        res.status(400).json({error: error.message});
       }
 });

  
 module.exports = UserRouter;