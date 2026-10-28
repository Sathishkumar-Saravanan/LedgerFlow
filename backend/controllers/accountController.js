
const mongoose = require("mongoose");

const Account = require("../models/Account");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

// Create Account
exports.createAccount = asyncHandler(async (req, res) => {
  const name = req.body.name;

  if (typeof name !== "string" || !name.trim()) {
    throw new AppError(
      "Account name is required",
      400,
      "VALIDATION_ERROR"
    );
  }

  if (name.trim().length > 120) {
    throw new AppError(
      "Account name cannot exceed 120 characters",
      400,
      "VALIDATION_ERROR"
    );
  }

  // Opening balance is zero.
  // Never accept an initial balance from the client.
  const account = await Account.create({
    name: name.trim(),
    balancePaise: 0,
  });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: {
      account_id: account._id,
      name: account.name,
      balance: 0,
      created_at: account.createdAt,
    },
  });
});

// Get All Accounts
exports.getAccounts = asyncHandler(async (req, res) => {
  const accounts = await Account.find()
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: accounts.map((account) => ({
      account_id: account._id,
      name: account.name,
      balance: account.balancePaise / 100,
      created_at: account.createdAt,
    })),
  });
});

// Get Single Account
exports.getAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      "Invalid account ID",
      400,
      "INVALID_ACCOUNT_ID"
    );
  }

  const account = await Account.findById(id).lean();

  if (!account) {
    throw new AppError(
      "Account not found",
      404,
      "ACCOUNT_NOT_FOUND"
    );
  }

  res.status(200).json({
    success: true,
    data: {
      account_id: account._id,
      name: account.name,
      balance: account.balancePaise / 100,
      created_at: account.createdAt,
    },
  });
});

// Get Account Balance
exports.getBalance = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(
      "Invalid account ID",
      400,
      "INVALID_ACCOUNT_ID"
    );
  }

  const account = await Account.findById(id)
    .select("name balancePaise createdAt")
    .lean();

  if (!account) {
    throw new AppError(
      "Account not found",
      404,
      "ACCOUNT_NOT_FOUND"
    );
  }

  if (
    !Number.isSafeInteger(account.balancePaise) ||
    account.balancePaise < 0
  ) {
    throw new AppError(
      "Account balance data is invalid",
      500,
      "INVALID_ACCOUNT_BALANCE"
    );
  }

  res.status(200).json({
    success: true,
    data: {
      account_id: account._id,
      name: account.name,
      balance: account.balancePaise / 100,
      created_at: account.createdAt,
    },
  });
});
