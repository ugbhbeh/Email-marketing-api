const {Router, json} = require("express");
const {PrismaClient} = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const {authenticateToken} = require("../middleware/Auth");
const CampaignRouter = Router();
const prisma = new PrismaClient();

// return all campaigns created by a user

// create campaign 

CampaignRouter.post('/new', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const {name} = req.body
try {
     const campaign = await prisma.campaign.create({
        data: {
            userId,
            name
        },
        select: {
            id: true,
            name: true,
            createdAt: true,
            user: {
                select: {
                id: true,
                email: true,
                name: true,
            },
            customers:{
                select:{
                id: true,
                email: true,
                name: true
            }
            },   
        }
      }
     });
     res.status(201).json(campaign);
} catch (err) {
    res.status(400).json({error: err.message})
}
});

// upload csv of clients and store them in data base

// route to manually add clients to database



// delete clients from a campaign one by one 

// delete a campaign 




module.exports = CampaignRouter





