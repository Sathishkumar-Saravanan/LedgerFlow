
import { useCallback, useEffect, useState } from "react";

import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  Plus,
  Search,
  CircleDollarSign,
  Clock3,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import {
  getBalance,
  getTransactions,
  createTransaction,
} from "../api/api";

import "./Dashboard.css";

// Backend returns money in RUPEES.
// Do not divide balance or transaction amount by 100 here.
const formatMoney = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const getErrorMessage = (error) => {
  const data = error.response?.data;

  const validationErrors = data?.errors;

  if (Array.isArray(validationErrors) && validationErrors.length) {
    return validationErrors
      .map((item) => item.msg || item.message)
      .filter(Boolean)
      .join(", ");
  }

  return (
    data?.error?.message ||
    data?.message ||
    data?.error ||
    error.message ||
    "Something went wrong."
  );
};

export default function Dashboard() {
  const [accountId, setAccountId] = useState(
    () => localStorage.getItem("ledgerflowAccountId") || ""
  );

  const [accountInput, setAccountInput] = useState(
    () => localStorage.getItem("ledgerflowAccountId") || ""
  );

  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    type: "credit",
    amount: "",
    reference_id: "",
    description: "",
  });

  // --------------------------------------------------
  // LOAD ACCOUNT BALANCE + TRANSACTION HISTORY
  // --------------------------------------------------
  const loadDashboard = useCallback(async () => {
    const id = accountId.trim();

    if (!id) {
      setBalance(null);
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Fetch account balance
      const balanceResponse = await getBalance(id);

      const balanceData =
        balanceResponse.data?.data ??
        balanceResponse.data;

      // Controller returns:
      // data: { account_id, balance }
      // balance is in RUPEES.
      const rawBalance = balanceData?.balance;

      if (
        rawBalance === undefined ||
        rawBalance === null ||
        !Number.isFinite(Number(rawBalance))
      ) {
        throw new Error(
          "Balance missing or invalid in API response."
        );
      }

      setBalance(Number(rawBalance));

      // 2. Fetch transaction history
      const transactionResponse = await getTransactions(
        id,
        {
          page: 1,
          limit: 10,
          ...(filter !== "all" ? { type: filter } : {}),
        }
      );

      const transactionData =
        transactionResponse.data?.data ??
        transactionResponse.data;

      // Your controller returns data as an array.
      const rows = Array.isArray(transactionData)
        ? transactionData
        : transactionData?.transactions ??
          transactionData?.items ??
          [];

      if (!Array.isArray(rows)) {
        throw new Error(
          "Invalid transaction history response."
        );
      }

      setTransactions(rows);
    } catch (err) {
      setBalance(null);
      setTransactions([]);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [accountId, filter]);

  // Reload when account or transaction filter changes.
  useEffect(() => {
    if (accountId) {
      loadDashboard();
    } else {
      setBalance(null);
      setTransactions([]);
    }
  }, [accountId, loadDashboard]);

  // --------------------------------------------------
  // LOAD ACCOUNT BUTTON
  // --------------------------------------------------
  const handleSelectAccount = (e) => {
    e.preventDefault();

    const id = accountInput.trim();

    if (!id) {
      setError("Please enter an account ID.");
      return;
    }

    setError("");
    setNotice("");

    // Save selected account.
    localStorage.setItem("ledgerflowAccountId", id);

    // If ID is unchanged, trigger refresh manually.
    if (id === accountId) {
      loadDashboard();
      return;
    }

    // useEffect will load the newly selected account.
    setAccountId(id);
  };

  // --------------------------------------------------
  // CREDIT / DEBIT TRANSACTION
  // --------------------------------------------------
  const handleTransaction = async (e) => {
    e.preventDefault();

    setError("");
    setNotice("");

    const amountText = form.amount.trim();
    const amount = Number(amountText);

    if (!accountId.trim()) {
      setError("Select an account first.");
      return;
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(amountText) ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Enter a valid amount greater than zero with up to two decimal places."
      );
      return;
    }

    if (!form.reference_id.trim()) {
      setError("Transaction reference is required.");
      return;
    }

    if (!form.description.trim()) {
      setError("Transaction description is required.");
      return;
    }

    // Backend validator expects amount in RUPEES.
    const payload = {
      type: form.type,
      amount,
      reference_id: form.reference_id.trim(),
      description: form.description.trim(),
    };

    setSubmitting(true);

    try {
      await createTransaction(accountId, payload);

      setNotice(
        `${form.type === "credit" ? "Credit" : "Debit"} completed successfully.`
      );

      setForm({
        type: "credit",
        amount: "",
        reference_id: "",
        description: "",
      });

      // Refresh latest balance and history.
      await loadDashboard();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // TRANSACTION TOTALS
  // amount from backend is in RUPEES.
  // --------------------------------------------------
  const totalCredits = transactions
    .filter((txn) => txn.type === "credit")
    .reduce(
      (sum, txn) => sum + Number(txn.amount ?? 0),
      0
    );

  const totalDebits = transactions
    .filter((txn) => txn.type === "debit")
    .reduce(
      (sum, txn) => sum + Number(txn.amount ?? 0),
      0
    );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <main className="lf-dashboard">
      {/* PAGE HEADER */}
      <header className="lf-page-header">
        <div>
          <p className="lf-eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
          <p className="lf-subtitle">
            Manage your ledger and monitor account activity.
          </p>
        </div>

        <button
          className="lf-btn lf-btn-secondary"
          onClick={loadDashboard}
          disabled={loading || !accountId}
          type="button"
        >
          <RefreshCw size={16} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {/* ACCOUNT SELECTOR */}
      <section className="lf-panel lf-account-panel">
        <div className="lf-section-heading">
          <div>
            <h2>Account</h2>
            <p>Select your ledger account</p>
          </div>
          <Wallet size={22} />
        </div>

        <form
          className="lf-account-form"
          onSubmit={handleSelectAccount}
        >
          <div className="lf-input-wrap">
            <Search size={18} />

            <input
              value={accountInput}
              onChange={(e) =>
                setAccountInput(e.target.value)
              }
              placeholder="Enter your account ID"
              aria-label="Account ID"
              required
            />
          </div>

          <button
            className="lf-btn lf-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Loading..." : "Load Account"}
          </button>
        </form>

        {accountId && (
          <p className="lf-account-id">
            Active account: <strong>{accountId}</strong>
          </p>
        )}
      </section>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          className="lf-alert lf-alert-error"
          role="alert"
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {notice && (
        <div
          className="lf-alert lf-alert-success"
          role="status"
        >
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {/* BALANCE CARDS */}
      <section className="lf-stats-grid">
        {/* AVAILABLE BALANCE */}
        <article className="lf-stat-card lf-stat-main">
          <div className="lf-stat-top">
            <span>Available Balance</span>

            <span className="lf-stat-icon">
              <Wallet size={20} />
            </span>
          </div>

          <h2>
            {balance === null
              ? "—"
              : formatMoney(balance)}
          </h2>

          <p>
            <CircleDollarSign size={15} />
            Current account balance
          </p>
        </article>

        {/* CREDITS */}
        <article className="lf-stat-card">
          <div className="lf-stat-top">
            <span>Credits</span>

            <span className="lf-stat-icon lf-icon-green">
              <ArrowDownLeft size={20} />
            </span>
          </div>

          <h2>{formatMoney(totalCredits)}</h2>

          <p>Credits in loaded history</p>
        </article>

        {/* DEBITS */}
        <article className="lf-stat-card">
          <div className="lf-stat-top">
            <span>Debits</span>

            <span className="lf-stat-icon lf-icon-red">
              <ArrowUpRight size={20} />
            </span>
          </div>

          <h2>{formatMoney(totalDebits)}</h2>

          <p>Debits in loaded history</p>
        </article>

        {/* TRANSACTIONS */}
        <article className="lf-stat-card">
          <div className="lf-stat-top">
            <span>Transactions</span>

            <span className="lf-stat-icon lf-icon-blue">
              <ArrowLeftRight size={20} />
            </span>
          </div>

          <h2>{transactions.length}</h2>

          <p>Transactions loaded</p>
        </article>
      </section>

      {/* MAIN CONTENT */}
      <section className="lf-content-grid">
        {/* NEW TRANSACTION */}
        <section className="lf-panel">
          <div className="lf-section-heading">
            <div>
              <h2>New Transaction</h2>
              <p>Credit or debit your account</p>
            </div>

            <Plus size={22} />
          </div>

          <form
            className="lf-transaction-form"
            onSubmit={handleTransaction}
          >
            <label>Transaction Type</label>

            <div className="lf-type-toggle">
              <button
                type="button"
                className={
                  form.type === "credit"
                    ? "active credit"
                    : ""
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    type: "credit",
                  }))
                }
                disabled={submitting}
              >
                <ArrowDownLeft size={17} />
                Credit
              </button>

              <button
                type="button"
                className={
                  form.type === "debit"
                    ? "active debit"
                    : ""
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    type: "debit",
                  }))
                }
                disabled={submitting}
              >
                <ArrowUpRight size={17} />
                Debit
              </button>
            </div>

            <label htmlFor="lf-amount">
              Amount (₹)
            </label>

            <input
              id="lf-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  amount: e.target.value,
                }))
              }
              required
              disabled={submitting}
            />

            <label htmlFor="lf-reference">
              Reference ID
            </label>

            <input
              id="lf-reference"
              placeholder="TXN-001"
              maxLength={150}
              value={form.reference_id}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  reference_id: e.target.value,
                }))
              }
              required
              disabled={submitting}
            />

            <label htmlFor="lf-description">
              Description
            </label>

            <input
              id="lf-description"
              placeholder="Transaction details"
              maxLength={500}
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              required
              disabled={submitting}
            />

            <button
              className="lf-btn lf-btn-primary lf-submit-btn"
              type="submit"
              disabled={
                submitting ||
                loading ||
                !accountId
              }
            >
              {submitting ? (
                <>
                  <RefreshCw
                    size={17}
                    className="lf-spin"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Submit {form.type}
                </>
              )}
            </button>

            <p className="lf-form-note">
              Transactions are processed by your backend.
            </p>
          </form>
        </section>

        {/* RECENT TRANSACTIONS */}
        <section className="lf-panel lf-history-panel">
          <div className="lf-section-heading lf-history-heading">
            <div>
              <h2>Recent Transactions</h2>
              <p>Latest account activity</p>
            </div>

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
              aria-label="Filter transaction type"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>

          {loading ? (
            <div className="lf-empty">
              <RefreshCw
                className="lf-spin"
                size={24}
              />
              <p>Loading transactions...</p>
            </div>
          ) : !accountId ? (
            <div className="lf-empty">
              <Wallet size={32} />
              <p>Select an account to view activity.</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="lf-empty">
              <Clock3 size={32} />
              <p>No transactions found.</p>
            </div>
          ) : (
            <div className="lf-table-wrap">
              <table className="lf-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Type</th>
                    <th className="lf-amount-col">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((txn, index) => (
                    <tr
                      key={
                        txn.transaction_id ||
                        txn._id ||
                        txn.reference_id ||
                        index
                      }
                    >
                      <td>
                        <div className="lf-txn-title">
                          {txn.description || "Transaction"}
                        </div>

                        <div className="lf-txn-meta">
                          {txn.reference_id || "No reference"}
                        </div>

                        <div className="lf-txn-date">
                          {txn.created_at || txn.createdAt
                            ? new Date(
                                txn.created_at ||
                                  txn.createdAt
                              ).toLocaleString("en-IN")
                            : ""}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`lf-badge ${
                            txn.type === "credit"
                              ? "lf-badge-credit"
                              : "lf-badge-debit"
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>

                      <td className="lf-amount-col">
                        <strong
                          className={
                            txn.type === "credit"
                              ? "lf-money-credit"
                              : "lf-money-debit"
                          }
                        >
                          {txn.type === "credit"
                            ? "+"
                            : "−"}
                          {formatMoney(txn.amount)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="lf-history-footer">
            <span>
              Showing up to 10 transactions
            </span>
            <Clock3 size={16} />
          </div>
        </section>
      </section>
    </main>
  );
}
