const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv')
dotenv.config();

const UserRouter = require("./routes/UserRouter.js");
const CampaignRouter = require("./routes/CampaignRouter.js")
const CustomerRouter = require("./routes/CustomerRouter.js")

const app = express();
const httpServer = http.createServer(app);
const port = 8080;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/users", UserRouter); 
app.use("/campaign", CampaignRouter)
app.use("/customer", CustomerRouter)


httpServer.listen(port, () => {
  console.log(`Server launched on port ${port}`);
});