const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");

const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const transactionService = require("../services/transactionService");

exports.createTransaction = asyncHandler(
  async (req, res) => {
    const result = await transactionService.createTransaction(
      req.params.id,
      req.body
    );

    const txn = result.transaction;

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: {
        transaction_id: txn._id,
        account_id: txn.account_id,
        type: txn.type,
        amount: txn.amountPaise / 100,
        description: txn.description,
        reference_id: txn.reference_id,
        created_at: txn.createdAt,
        balance: result.balance
      }
    });
  }
);

exports.getTransactions = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { type } = req.query;

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);

    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(
        "Invalid account ID",
        400,
        "INVALID_ACCOUNT_ID"
      );
    }

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      throw new AppError(
        "Invalid pagination parameters",
        400,
        "INVALID_PAGINATION"
      );
    }

    if (
      type !== undefined &&
      !["credit", "debit"].includes(type)
    ) {
      throw new AppError(
        "Type must be credit or debit",
        400,
        "INVALID_TRANSACTION_TYPE"
      );
    }

    const accountExists = await Account.exists({
      _id: id
    });

    if (!accountExists) {
      throw new AppError(
        "Account not found",
        404,
        "ACCOUNT_NOT_FOUND"
      );
    }

    const filter = {
      account_id: new mongoose.Types.ObjectId(id)
    };

    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const [transactions, totalRecords] =
      await Promise.all([
        Transaction.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Transaction.countDocuments(filter)
      ]);

    res.status(200).json({
      success: true,
      data: transactions.map((txn) => ({
        transaction_id: txn._id,
        account_id: txn.account_id,
        type: txn.type,
        amount: txn.amountPaise / 100,
        description: txn.description,
        reference_id: txn.reference_id,
        created_at: txn.createdAt
      })),
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      }
    });
  }
);