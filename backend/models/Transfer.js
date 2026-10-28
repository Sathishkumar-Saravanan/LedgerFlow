const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    fromAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true
    },

    toAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 1
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    referenceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    idempotencyKey: {
      type: String,
      required: true,
      immutable: true
    },

    status: {
      type: String,
      enum: ["completed"],
      default: "completed",
      required: true
    },

    senderTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true
    },

    receiverTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

transferSchema.index(
  { idempotencyKey: 1 },
  { unique: true }
);

transferSchema.index({ fromAccountId: 1, createdAt: -1 });
transferSchema.index({ toAccountId: 1, createdAt: -1 });

module.exports = mongoose.model("Transfer", transferSchema);