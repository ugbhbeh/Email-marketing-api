const {Router, json} = require("express");
const {PrismaClient} = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const {authenticateToken} = require("../middleware/Auth");
const CampaignRouter = Router();
const prisma = new PrismaClient();

// return all campaigns created by a user

CampaignRouter.get("/", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try{
        const campaigns = await prisma.campaign.findMany({
            where:{userId}, 
            select: {
               id: true,
               name: true,
               createdAt: true,
               updatedAt: true,
            }
        });
        res.status(200).json(campaigns)
    } catch (error){
        res.status(400).json({error: error.message})
    }
    
})

// get campaign details for a single campaign
CampaignRouter.get("/:id", authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const {id} = req.params

    try{
        const campaigndetails = await prisma.campaign.findFirst({
            where:{id, userId}, 
            select: {
               id: true,
               name: true,
               createdAt: true,
               updatedAt: true,
               customers: {
                select: {
                    id: true,
                    email: true, 
                    name: true
                }
               }
            }
        });
        
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
        res.status(200).json(campaigndetails)
    } catch (error){
        res.status(400).json({error: error.message})
    }
    
})

// create campaign 

CampaignRouter.post('/', authenticateToken, async (req, res) => {
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
        }
      }
     });
     res.status(201).json(campaign);
} catch (error) {
    res.status(400).json({error: error.message})
}
});



// upload csv of clients and store them in data base

// route to manually add clients to database

// add clients from database to campaign page

// delete clients from a campaign one by one 

// delete a campaign (/)




module.exports = CampaignRouter





