const {Router} = require("express");
const {PrismaClient} = require("@prisma/client");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const {authenticateToken} = require("../middleware/Auth");
const CampaignRouter = Router();
const prisma = new PrismaClient();

// create campaign 

// upload csv of clients and store them in data base

// route to manually add clients to database




module.exports = CampaignRouter





