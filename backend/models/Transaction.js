
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Amount must be a safe integer in paise"
      }
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    reference_id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    // Identifies transactions belonging to a transfer.
    // Null for normal credit/debit transactions.
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transfer",
      default: null
    },

    // The other account involved in the transfer.
    // Null for normal transactions.
    counterpartyAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null
    },

    // Distinguishes regular transactions from transfers.
    entryKind: {
      type: String,
      enum: ["normal", "transfer"],
      default: "normal",
      required: true
    }
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    },
    strict: "throw"
  }
);

// A reference ID can repeat across different accounts,
// but not within the same account.
transactionSchema.index(
  {
    account_id: 1,
    reference_id: 1
  },
  {
    unique: true
  }
);

// Helps account transaction history queries.
transactionSchema.index({
  account_id: 1,
  createdAt: -1,
  _id: -1
});

// Helps retrieve both ledger entries of a transfer.
transactionSchema.index({
  transferId: 1
});

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);
