const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            tirm: true,
            maxxlength: 120,
        },

        balancePaise: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isSafeInteger,
                message: "Balance must be a safe integer in paise"
            }
        }
    },
    {
        timestamps: {createdAt: true, updatedAt: false},
        strict: "throw"
    }
);
module.exports = mongoose.model("Account", accountSchema);