
import axios from "axios";

// ===============================
// API BASE URL
// ===============================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ===============================
// ACCOUNT APIs
// ===============================

// Get account balance
export const getBalance = (accountId) => {
  return api.get(
    `/accounts/${encodeURIComponent(accountId)}/balance`
  );
};

// Get account transaction history
export const getTransactions = (accountId, params = {}) => {
  return api.get(
    `/accounts/${encodeURIComponent(accountId)}/transactions`,
    { params }
  );
};

// Create credit or debit transaction
export const createTransaction = (accountId, payload) => {
  return api.post(
    `/accounts/${encodeURIComponent(accountId)}/transactions`,
    payload
  );
};

// Create new account
export const createAccount = (payload) => {
  return api.post("/accounts", payload);
};

// Get all accounts
export const getAccounts = () => {
  return api.get("/accounts");
};

// ===============================
// TRANSFER MONEY APIs
// ===============================

// Verify recipient account
export const verifyRecipient = (accountId) => {
  return api.get(
    `/accounts/${encodeURIComponent(accountId)}/balance`
  );
};

// Create money transfer
export const transferMoney = (payload, idempotencyKey) => {
  if (!idempotencyKey) {
    throw new Error("Idempotency key is required");
  }

  return api.post(
    "/transfers",
    payload,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    }
  );
};

// Get transfer history for an account
export const getTransferHistory = (accountId, params = {}) => {
  return api.get(
    `/transfers/accounts/${encodeURIComponent(accountId)}`,
    { params }
  );
};

// Get transfer receipt/details
export const getTransferReceipt = (transferId) => {
  return api.get(
    `/transfers/${encodeURIComponent(transferId)}`
  );
};

// ===============================
// DEFAULT AXIOS INSTANCE
// ===============================

export default api;
