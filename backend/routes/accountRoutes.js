
const express = require("express");
const router = express.Router();

const controller = require("../controllers/accountController");

const validateRequest = require("../middleware/validateRequest");
const {
  createAccountRules,
} = require("../validators/accountValidator");

// POST /api/v1/accounts
router.post(
  "/",
  createAccountRules,
  validateRequest,
  controller.createAccount
);

// GET /api/v1/accounts
router.get(
  "/",
  controller.getAccounts
);

// GET /api/v1/accounts/:id/balance
router.get(
  "/:id/balance",
  controller.getBalance
);

// GET /api/v1/accounts/:id
router.get(
  "/:id",
  controller.getAccount
);

module.exports = router;
