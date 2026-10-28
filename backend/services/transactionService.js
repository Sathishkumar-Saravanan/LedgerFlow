const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const AppError = require("../utils/AppError");

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

function toPaise(amount) {
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new AppError(
      "Amount must be greater than zero",
      400,
      "INVALID_AMOUNT"
    );
  }

  const paise = Math.round(amount * 100);

  // Allow at most two decimal places.
  if (
    !Number.isSafeInteger(paise) ||
    paise <= 0 ||
    Math.abs(amount * 100 - paise) > 1e-7
  ) {
    throw new AppError(
      "Amount must have at most two decimal places",
      400,
      "INVALID_AMOUNT"
    );
  }

  return paise;
}

async function createTransaction(accountId, payload) {
  const {
    type,
    amount,
    description,
    reference_id
  } = payload;

  if (!mongoose.isValidObjectId(accountId)) {
    throw new AppError(
      "Invalid account ID",
      400,
      "INVALID_ACCOUNT_ID"
    );
  }

  if (!["credit", "debit"].includes(type)) {
    throw new AppError(
      "Type must be credit or debit",
      400,
      "INVALID_TRANSACTION_TYPE"
    );
  }

  const amountPaise = toPaise(amount);

  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 500
  ) {
    throw new AppError(
      "A valid description is required",
      400,
      "VALIDATION_ERROR"
    );
  }

  if (
    typeof reference_id !== "string" ||
    !reference_id.trim() ||
    reference_id.trim().length > 150
  ) {
    throw new AppError(
      "A valid reference_id is required",
      400,
      "VALIDATION_ERROR"
    );
  }

  const accountObjectId =
    new mongoose.Types.ObjectId(accountId);

  const ref = reference_id.trim();

  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      // Check account existence inside the transaction.
      const account = await Account.findById(accountObjectId)
        .session(session);

      if (!account) {
        throw new AppError(
          "Account not found",
          404,
          "ACCOUNT_NOT_FOUND"
        );
      }

      // Conditional update protects against concurrent
      // debit requests.
      const filter = {
        _id: accountObjectId
      };

      const update = {};

      if (type === "debit") {
        filter.balancePaise = { $gte: amountPaise };
        update.$inc = {
          balancePaise: -amountPaise
        };
      } else {
        // Prevent balance exceeding safe integer limits.
        filter.balancePaise = {
          $lte: MAX_SAFE - amountPaise
        };

        update.$inc = {
          balancePaise: amountPaise
        };
      }

      const updatedAccount = await Account.findOneAndUpdate(
        filter,
        update,
        {
          new: true,
          session,
          runValidators: true
        }
      );

      if (!updatedAccount) {
        // Re-read within the transaction.
        const current = await Account.findById(accountObjectId)
          .session(session);

        if (!current) {
          throw new AppError(
            "Account not found",
            404,
            "ACCOUNT_NOT_FOUND"
          );
        }

        if (type === "debit") {
          throw new AppError(
            "Insufficient balance",
            400,
            "INSUFFICIENT_BALANCE"
          );
        }

        throw new AppError(
          "Balance limit exceeded",
          400,
          "BALANCE_LIMIT_EXCEEDED"
        );
      }

      // Persist transaction and balance together.
      const [transaction] = await Transaction.create(
        [
          {
            account_id: accountObjectId,
            type,
            amountPaise,
            description: description.trim(),
            reference_id: ref
          }
        ],
        { session }
      );

      result = {
        transaction,
        balancePaise: updatedAccount.balancePaise
      };
    });

    return {
      transaction: result.transaction,
      balance: result.balancePaise / 100
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(
        "Transaction reference already exists for this account",
        409,
        "DUPLICATE_TRANSACTION"
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createTransaction
};