const { body } = require("express-validator");

exports.createAccountRules = [
    body("name")
    .isString()
    .withMessage("Name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Account name is required")
    .bail()
    .isLength({max: 120})
    .withMessage("Name is too long"),

    body ("balance")
    .not()
    .exists()
    .withMessage("Initial balance cannot be provided")
];