
const express = require("express");
const cors = require("cors");

const apiRoutes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const transferRoutes = require("./routes/transferRoutes");

const app = express();

app.disable("x-powered-by");

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",

  // Vercel deployment origin from your browser error
  "https://ledger-flow-czew4zu1z-sathish-5f41.vercel.app",

  // Add your stable Vercel production domain here
  // Example:
  // "https://your-project.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (e.g. server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS: Origin not allowed")
      );
    },
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
    ],
  })
);

app.use(express.json({ limit: "20kb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "LedgerFlow API is running",
  });
});

app.use("/api/v1", apiRoutes);
app.use("/api/v1/transfers", transferRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
