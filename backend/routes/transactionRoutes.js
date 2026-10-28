const express = require("express");
const router = express.Router();

const controller = require("../controllers/transactionController");

const validateRequest = require("../middleware/validateRequest");

const {
  createTransactionRules
} = require("../validators/transactionValidator");

router.post(
  "/accounts/:id/transactions",
  createTransactionRules,
  validateRequest,
  controller.createTransaction
);

router.get(
  "/accounts/:id/transactions",
  controller.getTransactions
);

module.exports = router;