
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const Account = require("./models/Account");
const Transaction = require("./models/Transaction");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    // Ensure database indexes are initialized
    await Account.init();
    await Transaction.init();

    app.listen(PORT, () => {
      console.log(`LedgerFlow API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
