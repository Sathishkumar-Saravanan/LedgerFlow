
const express = require("express");
const cors = require("cors");

const apiRoutes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const transferRoutes = require("./routes/transferRoutes");

const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "20kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LedgerFlow API is running"
  });
});

app.use("/api/v1", apiRoutes);
app.use("/api/v1/transfers", transferRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
