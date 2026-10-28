
const express = require("express");

const router = express.Router();

const {
  createTransfer,
  getTransferReceipt,
  getTransferHistory,
} = require("../controllers/transferController");

// Create transfer
router.post("/", createTransfer);

// Account transfer history
router.get("/accounts/:accountId", getTransferHistory);

// Transfer receipt
router.get("/:transferId", getTransferReceipt);

module.exports = router;
