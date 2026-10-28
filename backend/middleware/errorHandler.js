module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "Something went wrong";

  if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Database validation failed";
  }

  if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = "Invalid identifier";
  }

  if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_TRANSACTION";
    message = "Duplicate transaction reference";
  }

  if (statusCode >= 500) {
    console.error(err);
    message = "Internal server error";
    code = "INTERNAL_SERVER_ERROR";
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
};