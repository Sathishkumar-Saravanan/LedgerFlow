
const { body } = require("express-validator");

exports.createTransactionRules = [
  // Transaction type
  body("type")
    .isIn(["credit", "debit"])
    .withMessage("Type must be credit or debit"),

  // Amount is entered in rupees
  body("amount")
    .isFloat({
      gt: 0,
      max: Number.MAX_SAFE_INTEGER / 100,
    })
    .withMessage("Amount must be greater than zero")
    .custom((amount) => {
      const value = Number(amount);
      const paise = Math.round(value * 100);

      if (
        !Number.isSafeInteger(paise) ||
        paise <= 0 ||
        Math.abs(value * 100 - paise) > 1e-7
      ) {
        throw new Error(
          "Amount must have at most two decimal places"
        );
      }

      return true;
    }),

  // Description is optional
  body("description")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Description must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Description cannot be empty")
    .bail()
    .isLength({ max: 500 })
    .withMessage("Description is too long"),

  // Reference ID
  body("reference_id")
    .isString()
    .withMessage("Reference ID must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Reference ID is required")
    .bail()
    .isLength({ max: 150 })
    .withMessage("Reference ID is too long"),
];
