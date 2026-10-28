
const mongoose = require("mongoose");
const crypto = require("crypto");

const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const Transfer = require("../models/Transfer");

// =====================================
// HELPERS
// =====================================

// Convert rupees to integer paise safely
const convertToPaise = (amount) => {
  if (
    amount === undefined ||
    amount === null ||
    amount === "" ||
    !/^\d+(\.\d{1,2})?$/.test(String(amount))
  ) {
    throw new Error("Invalid transfer amount");
  }

  const [rupees, fraction = ""] = String(amount).split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));

  if (!Number.isSafeInteger(paise) || paise <= 0) {
    throw new Error("Transfer amount must be positive and valid");
  }

  return paise;
};

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) &&
  String(new mongoose.Types.ObjectId(id)) === String(id);

const createRequestFingerprint = ({
  fromId,
  toId,
  amountPaise,
  description,
  referenceId,
}) => {
  const normalizedPayload = JSON.stringify({
    fromAccountId: String(fromId),
    toAccountId: String(toId),
    amountPaise,
    description: description.trim(),
    referenceId: referenceId.trim(),
  });

  return crypto
    .createHash("sha256")
    .update(normalizedPayload)
    .digest("hex");
};

const createTransferError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// =====================================
// EXECUTE TRANSFER
// =====================================

const executeTransfer = async ({
  fromAccountId,
  toAccountId,
  amount,
  description,
  referenceId,
  idempotencyKey,
}) => {
  // -----------------------------------
  // 1. Validate input
  // -----------------------------------

  if (!isValidObjectId(fromAccountId)) {
    throw createTransferError("Invalid sender account ID");
  }

  if (!isValidObjectId(toAccountId)) {
    throw createTransferError("Invalid recipient account ID");
  }

  const fromId = new mongoose.Types.ObjectId(fromAccountId);
  const toId = new mongoose.Types.ObjectId(toAccountId);

  if (fromId.equals(toId)) {
    throw createTransferError(
      "Sender and recipient accounts must be different"
    );
  }

  const amountPaise = convertToPaise(amount);

  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 500
  ) {
    throw createTransferError("Invalid transfer description");
  }

  if (
    typeof referenceId !== "string" ||
    !referenceId.trim() ||
    referenceId.trim().length > 150
  ) {
    throw createTransferError("Invalid reference ID");
  }

  if (
    typeof idempotencyKey !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(idempotencyKey)
  ) {
    throw createTransferError("Invalid idempotency key");
  }

  const cleanDescription = description.trim();
  const cleanReferenceId = referenceId.trim();

  const requestFingerprint = createRequestFingerprint({
    fromId,
    toId,
    amountPaise,
    description: cleanDescription,
    referenceId: cleanReferenceId,
  });

  // -----------------------------------
  // 2. Check existing idempotent request
  // -----------------------------------

  const findExistingTransfer = async () => {
    return Transfer.findOne({ idempotencyKey }).lean();
  };

  const formatExistingTransfer = (existing) => {
    if (existing.requestFingerprint !== requestFingerprint) {
      throw createTransferError(
        "Idempotency key was already used for a different request",
        409
      );
    }

    if (existing.status !== "completed") {
      throw createTransferError(
        "Transfer status requires verification",
        409
      );
    }

    return {
      transfer_id: String(existing._id),
      from_account_id: String(existing.fromAccountId),
      to_account_id: String(existing.toAccountId),
      amount: existing.amountPaise / 100,
      currency: "INR",
      description: existing.description,
      reference_id: existing.referenceId,
      status: existing.status,
      created_at: existing.createdAt,
      sender_transaction_id: existing.senderTransactionId
        ? String(existing.senderTransactionId)
        : null,
      receiver_transaction_id: existing.receiverTransactionId
        ? String(existing.receiverTransactionId)
        : null,
      idempotentReplay: true,
    };
  };

  const existing = await findExistingTransfer();

  if (existing) {
    return formatExistingTransfer(existing);
  }

  // -----------------------------------
  // 3. Prepare transfer IDs
  // -----------------------------------

  const transferId = new mongoose.Types.ObjectId();
  const senderTxnId = new mongoose.Types.ObjectId();
  const receiverTxnId = new mongoose.Types.ObjectId();

  const session = await mongoose.startSession();

  let transferResult;

  try {
    await session.withTransaction(async () => {
      // -----------------------------------
      // 4. Recheck idempotency inside transaction
      // -----------------------------------

      const duplicate = await Transfer.findOne({
        idempotencyKey,
      }).session(session);

      if (duplicate) {
        if (
          duplicate.requestFingerprint !== requestFingerprint
        ) {
          throw createTransferError(
            "Idempotency key conflict",
            409
          );
        }

        if (duplicate.status !== "completed") {
          throw createTransferError(
            "Transfer status requires verification",
            409
          );
        }

        transferResult = {
          transfer_id: String(duplicate._id),
          from_account_id: String(duplicate.fromAccountId),
          to_account_id: String(duplicate.toAccountId),
          amount: duplicate.amountPaise / 100,
          currency: "INR",
          description: duplicate.description,
          reference_id: duplicate.referenceId,
          status: duplicate.status,
          created_at: duplicate.createdAt,
          sender_transaction_id: duplicate.senderTransactionId
            ? String(duplicate.senderTransactionId)
            : null,
          receiver_transaction_id: duplicate.receiverTransactionId
            ? String(duplicate.receiverTransactionId)
            : null,
          idempotentReplay: true,
        };

        return;
      }

      // -----------------------------------
      // 5. Verify accounts exist
      // -----------------------------------

      const accounts = await Account.find({
        _id: { $in: [fromId, toId] },
      })
        .session(session)
        .lean();

      const senderExists = accounts.some(
        (account) => String(account._id) === String(fromId)
      );

      const recipientExists = accounts.some(
        (account) => String(account._id) === String(toId)
      );

      if (!senderExists) {
        throw createTransferError("Sender account not found", 404);
      }

      if (!recipientExists) {
        throw createTransferError(
          "Recipient account not found",
          404
        );
      }

      // -----------------------------------
      // 6. Debit sender atomically
      // -----------------------------------

      const debitResult = await Account.updateOne(
        {
          _id: fromId,
          balancePaise: { $gte: amountPaise },
        },
        {
          $inc: {
            balancePaise: -amountPaise,
          },
        },
        { session }
      );

      if (debitResult.modifiedCount !== 1) {
        const sender = await Account.findById(fromId)
          .session(session)
          .lean();

        if (!sender) {
          throw createTransferError(
            "Sender account not found",
            404
          );
        }

        throw createTransferError("Insufficient balance", 400);
      }

      // -----------------------------------
      // 7. Credit recipient
      // -----------------------------------

      const creditResult = await Account.updateOne(
        {
          _id: toId,
          balancePaise: {
            $lte: Number.MAX_SAFE_INTEGER - amountPaise,
          },
        },
        {
          $inc: {
            balancePaise: amountPaise,
          },
        },
        { session }
      );

      if (creditResult.modifiedCount !== 1) {
        throw createTransferError(
          "Recipient balance update failed or exceeds safe limit",
          400
        );
      }

      // -----------------------------------
      // 8. Create sender ledger entry
      // -----------------------------------

      const senderEntry = {
        _id: senderTxnId,
        account_id: fromId,
        type: "debit",
        amountPaise,
        description: cleanDescription,
        reference_id: cleanReferenceId,
        transferId,
        counterpartyAccountId: toId,
        entryKind: "transfer",
      };

      // -----------------------------------
      // 9. Create recipient ledger entry
      // -----------------------------------

      const receiverEntry = {
        _id: receiverTxnId,
        account_id: toId,
        type: "credit",
        amountPaise,
        description: cleanDescription,
        reference_id: cleanReferenceId,
        transferId,
        counterpartyAccountId: fromId,
        entryKind: "transfer",
      };

      // -----------------------------------
      // 10. Save both ledger entries
      // -----------------------------------

      await Transaction.create(
        [senderEntry, receiverEntry],
        {
          session,
          ordered: true,
        }
      );

      // -----------------------------------
      // 11. Save transfer receipt
      // -----------------------------------

      const transferRecord = {
        _id: transferId,
        fromAccountId: fromId,
        toAccountId: toId,
        amountPaise,
        description: cleanDescription,
        referenceId: cleanReferenceId,
        idempotencyKey,
        requestFingerprint,
        status: "completed",
        senderTransactionId: senderTxnId,
        receiverTransactionId: receiverTxnId,
      };

      await Transfer.create(
        [transferRecord],
        {
          session,
          ordered: true,
        }
      );

      // -----------------------------------
      // 12. Prepare response
      // -----------------------------------

      transferResult = {
        transfer_id: String(transferId),
        from_account_id: String(fromId),
        to_account_id: String(toId),
        amount: amountPaise / 100,
        currency: "INR",
        description: cleanDescription,
        reference_id: cleanReferenceId,
        status: "completed",
        created_at: new Date(),
        sender_transaction_id: String(senderTxnId),
        receiver_transaction_id: String(receiverTxnId),
        idempotentReplay: false,
      };
    });

    if (!transferResult) {
      throw new Error("Transfer result was not generated");
    }

    return transferResult;
  } catch (error) {
    // -----------------------------------
    // 13. Handle duplicate-key race
    // -----------------------------------

    if (error.code === 11000) {
      const duplicate = await findExistingTransfer();

      if (duplicate) {
        return formatExistingTransfer(duplicate);
      }
    }

    throw error;
  } finally {
    // -----------------------------------
    // 14. Release MongoDB session
    // -----------------------------------

    await session.endSession();
  }
};

module.exports = {
  executeTransfer,
};
