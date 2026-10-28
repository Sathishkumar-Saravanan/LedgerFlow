
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  IndianRupee,
  LoaderCircle,
  Wallet,
  XCircle,
} from "lucide-react";

import {
  getBalance,
  createTransaction,
} from "../api/api";

import "./NewTransaction.css";

// ========================================
// NOTIFICATION HELPER
// ========================================
const addTransactionNotification = (transaction) => {
  try {
    const stored = JSON.parse(
      localStorage.getItem("ledgerflowNotifications") || "[]"
    );

    const existing = Array.isArray(stored) ? stored : [];

    const notification = {
      id: crypto.randomUUID(),
      title: "Transaction Created",
      message: `${String(transaction.type).toUpperCase()} of ₹${Number(
        transaction.amount
      ).toFixed(2)} was added successfully.`,
      time: transaction.created_at || new Date().toISOString(),
      read: false,
      path: "/transactions",
    };

    const updatedNotifications = [
      notification,
      ...existing,
    ].slice(0, 50);

    localStorage.setItem(
      "ledgerflowNotifications",
      JSON.stringify(updatedNotifications)
    );

    // Update Topbar immediately in the current tab
    window.dispatchEvent(
      new Event("ledgerflow-notifications-updated")
    );
  } catch (error) {
    console.error("Unable to save transaction notification:", error);
  }
};

// ========================================
// HELPER: ERROR MESSAGE
// ========================================
const getErrorMessage = (error) => {
  const data = error.response?.data;

  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item) => item.msg || item.message || String(item))
      .join(", ");
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  return error.message || "Something went wrong.";
};

// ========================================
// NEW TRANSACTION PAGE
// ========================================
function NewTransaction() {
  const navigate = useNavigate();

  const [accountId, setAccountId] = useState(
    () => localStorage.getItem("ledgerflowAccountId") || ""
  );

  const [type, setType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [description, setDescription] = useState("");

  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdTransaction, setCreatedTransaction] = useState(null);

  // ========================================
  // FETCH ACCOUNT BALANCE
  // Backend returns balance in RUPEES
  // ========================================
  const fetchBalance = useCallback(async (id) => {
    if (!id?.trim()) {
      setBalance(null);
      return;
    }

    try {
      setBalanceLoading(true);

      const response = await getBalance(id.trim());
      const balanceValue = response.data?.data?.balance;

      if (
        typeof balanceValue !== "number" &&
        (typeof balanceValue !== "string" ||
          balanceValue.trim() === "")
      ) {
        throw new Error("Invalid balance response from server.");
      }

      const parsedBalance = Number(balanceValue);

      if (!Number.isFinite(parsedBalance)) {
        throw new Error("Invalid account balance.");
      }

      // API balance is already rupees.
      setBalance(parsedBalance);
    } catch (err) {
      setBalance(null);
      setError(getErrorMessage(err));
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedAccountId =
      localStorage.getItem("ledgerflowAccountId") || "";

    if (savedAccountId) {
      setAccountId(savedAccountId);
      fetchBalance(savedAccountId);
    }
  }, [fetchBalance]);

  // ========================================
  // ACCOUNT ID CHANGE
  // ========================================
  const handleAccountChange = (event) => {
    const value = event.target.value;

    setAccountId(value);
    setBalance(null);
    setError("");
    setSuccess("");
    setCreatedTransaction(null);
  };

  const handleLoadAccount = async () => {
    if (!accountId.trim()) {
      setError("Please enter an account ID.");
      return;
    }

    setError("");
    setSuccess("");
    setCreatedTransaction(null);

    localStorage.setItem(
      "ledgerflowAccountId",
      accountId.trim()
    );

    await fetchBalance(accountId.trim());
  };

  // ========================================
  // TRANSACTION SUBMISSION
  // ========================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setSuccess("");
    setCreatedTransaction(null);

    const normalizedAccountId = accountId.trim();
    const normalizedReferenceId = referenceId.trim();
    const normalizedDescription = description.trim();

    // Account validation
    if (!normalizedAccountId) {
      setError("Please enter your account ID.");
      return;
    }

    // Amount validation
    if (!amount.trim()) {
      setError("Please enter the transaction amount.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      setError(
        "Enter a valid amount with up to 2 decimal places."
      );
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    // Ensure conversion to paise stays safely representable
    const amountPaise = Math.round(numericAmount * 100);

    if (
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0
    ) {
      setError("Please enter a valid transaction amount.");
      return;
    }

    if (!normalizedReferenceId) {
      setError("Please enter a reference ID.");
      return;
    }

    if (normalizedReferenceId.length > 150) {
      setError("Reference ID cannot exceed 150 characters.");
      return;
    }

    if (!normalizedDescription) {
      setError("Please enter a transaction description.");
      return;
    }

    if (normalizedDescription.length > 500) {
      setError("Description cannot exceed 500 characters.");
      return;
    }

    const payload = {
      type,
      amount: numericAmount,
      reference_id: normalizedReferenceId,
      description: normalizedDescription,
    };

    try {
      setSubmitting(true);

      // Create transaction through backend
      const response = await createTransaction(
        normalizedAccountId,
        payload
      );

      const transaction = response.data?.data;

      if (!transaction) {
        throw new Error(
          "Transaction response was not received correctly."
        );
      }

      // Remember the account used
      localStorage.setItem(
        "ledgerflowAccountId",
        normalizedAccountId
      );

      // Save transaction notification
      addTransactionNotification({
        ...transaction,
        type: transaction.type || type,
        amount: transaction.amount ?? numericAmount,
      });

      // Success state
      setSuccess("Transaction created successfully!");
      setCreatedTransaction(transaction);

      // Reset transaction form
      setAmount("");
      setReferenceId("");
      setDescription("");

      // Refresh current account balance
      await fetchBalance(normalizedAccountId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ========================================
  // FORMAT RUPEES
  // ========================================
  const formatCurrency = (value) => {
    if (value === null || value === undefined) {
      return "--";
    }

    return Number(value).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // ========================================
  // UI
  // ========================================
  return (
    <div className="new-transaction-page">

      {/* PAGE HEADER */}
      <div className="new-transaction-header">
        <div>
          <button
            type="button"
            className="nt-back-btn"
            onClick={() => navigate("/transactions")}
          >
            <ArrowLeft size={17} />
            Back to Transactions
          </button>

          <h1>New Transaction</h1>

          <p>
            Record a credit or debit transaction in your ledger.
          </p>
        </div>
      </div>

      {/* ACCOUNT SUMMARY */}
      <div className="nt-account-card">
        <div className="nt-account-icon">
          <Wallet size={25} />
        </div>

        <div className="nt-account-info">
          <span>Selected Account</span>

          <strong>
            {accountId || "No account selected"}
          </strong>

          <small>
            {balanceLoading
              ? "Loading balance..."
              : balance !== null
                ? "Current available ledger balance"
                : "Load an account to view its balance"}
          </small>
        </div>

        <div className="nt-account-balance">
          <span>Current Balance</span>

          <strong>
            {balanceLoading
              ? "Loading..."
              : formatCurrency(balance)}
          </strong>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="nt-content-grid">

        {/* TRANSACTION FORM */}
        <div className="nt-form-card">
          <div className="nt-form-heading">
            <div>
              <h2>Transaction Details</h2>
              <p>
                Enter the required transaction information.
              </p>
            </div>

            <div className="nt-heading-icon">
              <CreditCard size={22} />
            </div>
          </div>

          {/* ACCOUNT SELECTION */}
          <div className="nt-field">
            <label htmlFor="nt-account">
              Account ID <span>*</span>
            </label>

            <div className="nt-account-input-row">
              <input
                id="nt-account"
                type="text"
                value={accountId}
                onChange={handleAccountChange}
                placeholder="Enter your account ID"
                required
              />

              <button
                type="button"
                className="nt-load-btn"
                onClick={handleLoadAccount}
                disabled={balanceLoading || !accountId.trim()}
              >
                {balanceLoading ? "Loading..." : "Load"}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>

            {/* TRANSACTION TYPE */}
            <div className="nt-field">
              <label>
                Transaction Type <span>*</span>
              </label>

              <div className="nt-type-selector">
                <button
                  type="button"
                  className={`nt-type-btn nt-credit-btn ${
                    type === "credit" ? "active" : ""
                  }`}
                  onClick={() => setType("credit")}
                >
                  <span className="nt-type-symbol">+</span>

                  <span>
                    <strong>Credit</strong>
                    <small>Money received</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`nt-type-btn nt-debit-btn ${
                    type === "debit" ? "active" : ""
                  }`}
                  onClick={() => setType("debit")}
                >
                  <span className="nt-type-symbol">−</span>

                  <span>
                    <strong>Debit</strong>
                    <small>Money spent</small>
                  </span>
                </button>
              </div>
            </div>

            {/* AMOUNT */}
            <div className="nt-field">
              <label htmlFor="nt-amount">
                Amount <span>*</span>
              </label>

              <div className="nt-amount-input">
                <IndianRupee size={19} />

                <input
                  id="nt-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <small className="nt-field-help">
                Enter amount in INR (₹), up to 2 decimal places.
              </small>
            </div>

            {/* REFERENCE ID */}
            <div className="nt-field">
              <label htmlFor="nt-reference">
                Reference ID <span>*</span>
              </label>

              <input
                id="nt-reference"
                type="text"
                value={referenceId}
                onChange={(event) =>
                  setReferenceId(event.target.value)
                }
                placeholder="e.g. REF-2026-001"
                maxLength={150}
                required
              />
            </div>

            {/* DESCRIPTION */}
            <div className="nt-field">
              <label htmlFor="nt-description">
                Description <span>*</span>
              </label>

              <textarea
                id="nt-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Enter transaction details..."
                rows={4}
                maxLength={500}
                required
              />

              <small className="nt-field-help">
                {description.length}/500 characters
              </small>
            </div>

            {/* ERROR */}
            {error && (
              <div className="nt-alert nt-alert-error" role="alert">
                <XCircle size={19} />
                <span>{error}</span>
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div
                className="nt-alert nt-alert-success"
                role="status"
              >
                <CheckCircle2 size={19} />
                <span>{success}</span>
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              className="nt-submit-btn"
              disabled={submitting || balanceLoading}
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    size={19}
                    className="nt-loading-icon"
                  />
                  Processing Transaction...
                </>
              ) : (
                <>
                  <CreditCard size={19} />
                  Create Transaction
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT PANEL */}
        <div className="nt-side-panel">

          {/* PREVIEW */}
          <div className="nt-preview-card">
            <div className="nt-preview-heading">
              <span>Transaction Preview</span>
              <CreditCard size={20} />
            </div>

            <div
              className={`nt-preview-amount ${
                type === "credit"
                  ? "nt-preview-credit"
                  : "nt-preview-debit"
              }`}
            >
              <span>
                {type === "credit" ? "+" : "−"}
                {formatCurrency(
                  amount && Number.isFinite(Number(amount))
                    ? Number(amount)
                    : 0
                )}
              </span>
            </div>

            <div className="nt-preview-type">
              <span>Transaction Type</span>
              <strong>
                {type === "credit" ? "Credit" : "Debit"}
              </strong>
            </div>

            <div className="nt-preview-type">
              <span>Reference ID</span>
              <strong>
                {referenceId.trim() || "--"}
              </strong>
            </div>

            <div className="nt-preview-type">
              <span>Account</span>
              <strong>
                {accountId
                  ? `${accountId.slice(0, 8)}${
                      accountId.length > 8 ? "..." : ""
                    }`
                  : "--"}
              </strong>
            </div>
          </div>

          {/* INFORMATION */}
          <div className="nt-info-card">
            <div className="nt-info-title">
              <CheckCircle2 size={20} />
              <h3>Before You Submit</h3>
            </div>

            <ul>
              <li>Verify the selected account.</li>
              <li>Enter the correct transaction amount.</li>
              <li>Provide a unique reference ID as required by your API.</li>
              <li>Include a meaningful description.</li>
              <li>Review the transaction type before submitting.</li>
            </ul>
          </div>

          {/* LAST SUCCESS */}
          {createdTransaction && (
            <div className="nt-created-card">
              <div className="nt-created-heading">
                <CheckCircle2 size={20} />
                <h3>Transaction Created</h3>
              </div>

              <p>
                Transaction ID
              </p>

              <strong className="nt-created-id">
                {createdTransaction.transaction_id || "--"}
              </strong>

              <button
                type="button"
                className="nt-view-transactions-btn"
                onClick={() => navigate("/transactions")}
              >
                View Transactions
                <ArrowRight size={17} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default NewTransaction;
