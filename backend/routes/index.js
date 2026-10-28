const express = require("express");
const router = express.Router();

const accountRoutes = require("./accountRoutes");
const transactionRoutes = require("./transactionRoutes");

router.use("/accounts", accountRoutes);

// Transaction routes are mounted separately because
// they contain /accounts/:id/transactions.
router.use("/", transactionRoutes);

module.exports = router;