const {Router} = require("express");
const {PrismaClient} = require("@prisma/client");
const {authenticateToken} = require("../middleware/Auth");
const CustomerRouter = Router();
const prisma = new PrismaClient();

// add csv of clients 

CustomerRouter.post("/", authenticateToken, async(req, res) => {
    const userId = req.user.userId
    const customers = req.body

    if (!Array.isArray(clients) || clients.length === 0) {
     return res.status(400).json({ error: "No clients provided" });
    };

    try{

    } 



}  {

})
// add manual clients 

// update info for clients 

// delete clients from database