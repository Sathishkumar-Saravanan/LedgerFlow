
const mongoose = require("mongoose");

const Transfer = require("../models/Transfer");
const { executeTransfer } = require("../services/transferService");

// =====================================
// HELPERS
// =====================================

const sendError = (res, error) => {
  if (res.headersSent) {
    return;
  }

  const statusCode =
    Number.isInteger(error?.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  // Detailed errors remain server-side
  console.error("Transfer Controller Error:", {
    message: error?.message,
    name: error?.name,
    code: error?.code,
    stack: error?.stack,
  });

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode < 500
        ? error.message
        : "Transfer could not be completed",
  });
};

const isValidObjectId = (id) =>
  typeof id === "string" &&
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === id;

// Format transfer receipt
const formatTransfer = (transfer) => ({
  transfer_id: String(transfer._id),
  from_account_id: String(transfer.fromAccountId),
  to_account_id: String(transfer.toAccountId),
  amount: transfer.amountPaise / 100,
  currency: "INR",
  description: transfer.description,
  reference_id: transfer.referenceId,
  status: transfer.status,
  created_at: transfer.createdAt,
  sender_transaction_id: transfer.senderTransactionId
    ? String(transfer.senderTransactionId)
    : null,
  receiver_transaction_id: transfer.receiverTransactionId
    ? String(transfer.receiverTransactionId)
    : null,
});

// =====================================
// CREATE TRANSFER
// POST /api/v1/transfers
// =====================================

const createTransfer = async (req, res) => {
  try {
    const {
      fromAccountId,
      toAccountId,
      amount,
      description,
      referenceId,
    } = req.body || {};

    const idempotencyKey = req.get("Idempotency-Key");

    // Validate required fields
    if (
      !fromAccountId ||
      !toAccountId ||
      amount === undefined ||
      amount === null ||
      !description ||
      !referenceId
    ) {
      return res.status(400).json({
        success: false,
        message: "All transfer fields are required",
      });
    }

    // Validate account IDs
    if (
      !isValidObjectId(fromAccountId) ||
      !isValidObjectId(toAccountId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid sender or recipient account ID",
      });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({
        success: false,
        message: "Sender and recipient must be different",
      });
    }

    // Validate idempotency key
    if (
      typeof idempotencyKey !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(idempotencyKey)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid Idempotency-Key header is required",
      });
    }

    // Execute atomic transfer
    const result = await executeTransfer({
      fromAccountId,
      toAccountId,
      amount,
      description,
      referenceId,
      idempotencyKey,
    });

    return res.status(result.idempotentReplay ? 200 : 201).json({
      success: true,
      message: result.idempotentReplay
        ? "Existing transfer returned"
        : "Transfer completed successfully",
      data: result,
    });
  } catch (error) {
    // No instanceof checks here
    return sendError(res, error);
  }
};

// =====================================
// GET TRANSFER RECEIPT
// GET /api/v1/transfers/:transferId
// =====================================

const getTransferReceipt = async (req, res) => {
  try {
    const { transferId } = req.params;

    if (!isValidObjectId(transferId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer ID",
      });
    }

    const transfer = await Transfer.findById(transferId).lean();

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatTransfer(transfer),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

// =====================================
// GET ACCOUNT TRANSFER HISTORY
// GET /api/v1/transfers/accounts/:accountId
// =====================================

const getTransferHistory = async (req, res) => {
  try {
    const { accountId } = req.params;

    if (!isValidObjectId(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const accountObjectId = new mongoose.Types.ObjectId(accountId);

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { fromAccountId: accountObjectId },
        { toAccountId: accountObjectId },
      ],
    };

    const [transfers, total] = await Promise.all([
      Transfer.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Transfer.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: transfers.map(formatTransfer),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

// =====================================
// EXPORT CONTROLLERS
// =====================================

module.exports = {
  createTransfer,
  getTransferReceipt,
  getTransferHistory,
};
