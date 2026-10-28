const mongoose = require("mongoose");

function validateTransfer(req, res, next) {
  const {
    from_account_id,
    to_account_id,
    amount,
    description,
    reference_id
  } = req.body || {};

  const errors = [];

  const validId = (id) =>
    typeof id === "string" &&
    mongoose.isValidObjectId(id);

  if (!validId(from_account_id)) {
    errors.push("Invalid sender account ID");
  }

  if (!validId(to_account_id)) {
    errors.push("Invalid recipient account ID");
  }

  if (
    validId(from_account_id) &&
    validId(to_account_id) &&
    from_account_id.toLowerCase() ===
      to_account_id.toLowerCase()
  ) {
    errors.push("Sender and recipient must be different");
  }

  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    Math.round(amount * 100) / 100 !== amount
  ) {
    errors.push(
      "Amount must be a positive number with up to 2 decimals"
    );
  }

  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 500
  ) {
    errors.push("Valid description is required");
  }

  if (
    typeof reference_id !== "string" ||
    !reference_id.trim() ||
    reference_id.trim().length > 150
  ) {
    errors.push("Valid reference ID is required");
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
}

module.exports = { validateTransfer };