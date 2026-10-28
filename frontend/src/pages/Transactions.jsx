
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  Search,
  Wallet,
  Clock3,
  AlertCircle,
  ReceiptText,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import { getTransactions } from "../api/api";
import "./Transactions.css";

const PAGE_SIZE = 10;

const formatMoney = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error) =>
  error.response?.data?.error?.message ||
  error.response?.data?.message ||
  error.message ||
  "Unable to load transactions.";

function normalizeTransactions(response) {
  const body = response?.data ?? response;
  const data = body?.data ?? body;

  if (Array.isArray(data)) {
    return {
      rows: data,
      pagination: body?.pagination ?? null,
    };
  }

  const rows =
    data?.transactions ??
    data?.items ??
    [];

  if (!Array.isArray(rows)) {
    throw new Error(
      "Unexpected transaction history response."
    );
  }

  return {
    rows,
    pagination:
      body?.pagination ??
      data?.pagination ??
      null,
  };
}

export default function Transactions() {
  const navigate = useNavigate();

  const [accountId, setAccountId] = useState(
    () => localStorage.getItem("ledgerflowAccountId") || ""
  );

  const [accountInput, setAccountInput] = useState(
    () => localStorage.getItem("ledgerflowAccountId") || ""
  );

  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTransactions = useCallback(async () => {
    if (!accountId.trim()) {
      setTransactions([]);
      setError("Enter an account ID to view transactions.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        ...(filter !== "all" ? { type: filter } : {}),
      };

      const response = await getTransactions(
        accountId.trim(),
        params
      );

      const result = normalizeTransactions(response);

      setTransactions(result.rows);

      const pagination = result.pagination;

      if (pagination) {
        setTotalPages(
          Math.max(1, Number(pagination.totalPages) || 1)
        );

        setTotalRecords(
          Number(pagination.totalRecords) ||
          result.rows.length
        );
      } else {
        setTotalPages(1);
        setTotalRecords(result.rows.length);
      }
    } catch (err) {
      setTransactions([]);
      setTotalPages(1);
      setTotalRecords(0);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [accountId, page, filter]);

  useEffect(() => {
    if (accountId) {
      loadTransactions();
    }
  }, [accountId, loadTransactions]);

  function handleLoadAccount(e) {
    e.preventDefault();

    const id = accountInput.trim();

    if (!id) {
      setError("Please enter an Account ID.");
      return;
    }

    setError("");
    setNotice("");

    localStorage.setItem("ledgerflowAccountId", id);
    setAccountId(id);
    setPage(1);
  }

  function handleFilterChange(value) {
    setFilter(value);
    setPage(1);
  }

  function handlePageChange(nextPage) {
    if (
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === page
    ) {
      return;
    }

    setPage(nextPage);
  }

  const searchText = search.trim().toLowerCase();

  const visibleTransactions = transactions.filter((txn) => {
    const description = String(
      txn.description || ""
    ).toLowerCase();

    const reference = String(
      txn.reference_id || ""
    ).toLowerCase();

    const id = String(
      txn.transaction_id || txn._id || ""
    ).toLowerCase();

    return (
      description.includes(searchText) ||
      reference.includes(searchText) ||
      id.includes(searchText)
    );
  });

  const creditTotal = transactions
    .filter((txn) => txn.type === "credit")
    .reduce(
      (sum, txn) => sum + Number(txn.amount || 0),
      0
    );

  const debitTotal = transactions
    .filter((txn) => txn.type === "debit")
    .reduce(
      (sum, txn) => sum + Number(txn.amount || 0),
      0
    );

  return (
    <main className="txn-page">
      {/* Header */}
      <header className="txn-header">
        <div>
          <span className="txn-eyebrow">
            LEDGER MANAGEMENT
          </span>

          <h1>Transactions</h1>

          <p>
            Monitor and review your account activity.
          </p>
        </div>

        <div className="txn-header-actions">
          <button
            className="txn-btn txn-btn-secondary"
            type="button"
            onClick={loadTransactions}
            disabled={loading || !accountId}
          >
            <RefreshCw
              size={17}
              className={loading ? "txn-spin" : ""}
            />
            Refresh
          </button>

          <button
            className="txn-btn txn-btn-primary"
            type="button"
            onClick={() => navigate("/")}
          >
            <Plus size={17} />
            New Transaction
          </button>
        </div>
      </header>

      {/* Account selector */}
      <section className="txn-panel txn-account-panel">
        <div className="txn-section-heading">
          <div>
            <h2>Account</h2>
            <p>Load the account transaction history</p>
          </div>

          <Wallet size={24} />
        </div>

        <form
          className="txn-account-form"
          onSubmit={handleLoadAccount}
        >
          <div className="txn-input-wrap">
            <Search size={18} />

            <input
              type="text"
              value={accountInput}
              onChange={(e) =>
                setAccountInput(e.target.value)
              }
              placeholder="Enter your Account ID"
              aria-label="Account ID"
            />

            {accountInput && (
              <button
                type="button"
                className="txn-clear-btn"
                onClick={() => setAccountInput("")}
                aria-label="Clear Account ID"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <button
            className="txn-btn txn-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Loading..." : "Load Account"}
          </button>
        </form>

        {accountId && (
          <p className="txn-account-id">
            Active account: <strong>{accountId}</strong>
          </p>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="txn-alert txn-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div className="txn-alert txn-alert-success" role="status">
          {notice}
        </div>
      )}

      {/* Summary */}
      <section className="txn-summary-grid">
        <article className="txn-summary-card">
          <div className="txn-summary-top">
            <span>Transactions</span>
            <div className="txn-summary-icon blue">
              <ReceiptText size={20} />
            </div>
          </div>

          <h2>{totalRecords}</h2>
          <p>Total matching records</p>
        </article>

        <article className="txn-summary-card">
          <div className="txn-summary-top">
            <span>Credits</span>
            <div className="txn-summary-icon green">
              <ArrowDownLeft size={20} />
            </div>
          </div>

          <h2>{formatMoney(creditTotal)}</h2>
          <p>Credits on this page</p>
        </article>

        <article className="txn-summary-card">
          <div className="txn-summary-top">
            <span>Debits</span>
            <div className="txn-summary-icon red">
              <ArrowUpRight size={20} />
            </div>
          </div>

          <h2>{formatMoney(debitTotal)}</h2>
          <p>Debits on this page</p>
        </article>

        <article className="txn-summary-card">
          <div className="txn-summary-top">
            <span>Current Page</span>
            <div className="txn-summary-icon purple">
              <ArrowLeftRight size={20} />
            </div>
          </div>

          <h2>
            {page} / {totalPages}
          </h2>
          <p>Transaction history</p>
        </article>
      </section>

      {/* Transaction history */}
      <section className="txn-panel txn-history">
        <div className="txn-history-heading">
          <div>
            <h2>Transaction History</h2>
            <p>View your latest ledger transactions</p>
          </div>

          <div className="txn-history-controls">
            <div className="txn-search-wrap">
              <Search size={17} />

              <input
                type="search"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search transactions"
              />
            </div>

            <select
              value={filter}
              onChange={(e) =>
                handleFilterChange(e.target.value)
              }
              aria-label="Filter transaction type"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
        </div>

        {!accountId ? (
          <div className="txn-empty">
            <Wallet size={35} />
            <h3>No account selected</h3>
            <p>
              Enter an Account ID above to view its transactions.
            </p>
          </div>
        ) : loading ? (
          <div className="txn-empty">
            <RefreshCw
              size={27}
              className="txn-spin"
            />
            <p>Loading transaction history...</p>
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div className="txn-empty">
            {error ? (
              <AlertCircle size={35} />
            ) : (
              <Clock3 size={35} />
            )}

            <h3>
              {error
                ? "Unable to load history"
                : search
                  ? "No matching transactions"
                  : "No transactions found"}
            </h3>

            <p>
              {error
                ? "Check your account ID and API connection."
                : search
                  ? "Try another description or reference ID."
                  : "Transactions will appear here after activity."}
            </p>

            {search && (
              <button
                type="button"
                className="txn-btn txn-btn-secondary"
                onClick={() => setSearch("")}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="txn-table-wrap">
              <table className="txn-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Reference ID</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th className="txn-amount-col">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleTransactions.map((txn, index) => {
                    const isCredit = txn.type === "credit";

                    const transactionId =
                      txn.transaction_id ||
                      txn._id ||
                      `${txn.reference_id || "txn"}-${index}`;

                    return (
                      <tr key={transactionId}>
                        <td>
                          <div className="txn-title">
                            {txn.description || "Transaction"}
                          </div>

                          <div className="txn-meta">
                            ID: {transactionId}
                          </div>
                        </td>

                        <td>
                          <span className="txn-reference">
                            {txn.reference_id || "—"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`txn-badge ${
                              isCredit
                                ? "txn-badge-credit"
                                : "txn-badge-debit"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft size={14} />
                            ) : (
                              <ArrowUpRight size={14} />
                            )}
                            {txn.type}
                          </span>
                        </td>

                        <td>
                          <span className="txn-date">
                            {formatDate(
                              txn.created_at || txn.createdAt
                            )}
                          </span>
                        </td>

                        <td className="txn-amount-col">
                          <strong
                            className={
                              isCredit
                                ? "txn-money-credit"
                                : "txn-money-debit"
                            }
                          >
                            {isCredit ? "+" : "−"}
                            {formatMoney(txn.amount)}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="txn-mobile-list">
              {visibleTransactions.map((txn, index) => {
                const isCredit = txn.type === "credit";

                return (
                  <article
                    className="txn-mobile-card"
                    key={
                      txn.transaction_id ||
                      txn._id ||
                      `${txn.reference_id || "txn"}-${index}`
                    }
                  >
                    <div className="txn-mobile-card-top">
                      <div>
                        <h3>
                          {txn.description || "Transaction"}
                        </h3>
                        <p>
                          {txn.reference_id || "No reference"}
                        </p>
                      </div>

                      <strong
                        className={
                          isCredit
                            ? "txn-money-credit"
                            : "txn-money-debit"
                        }
                      >
                        {isCredit ? "+" : "−"}
                        {formatMoney(txn.amount)}
                      </strong>
                    </div>

                    <div className="txn-mobile-card-bottom">
                      <span
                        className={`txn-badge ${
                          isCredit
                            ? "txn-badge-credit"
                            : "txn-badge-debit"
                        }`}
                      >
                        {txn.type}
                      </span>

                      <span className="txn-date">
                        {formatDate(
                          txn.created_at || txn.createdAt
                        )}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="txn-pagination">
              <span>
                Page {page} of {totalPages}
                {" · "}
                {totalRecords} records
                {search ? " · Search applies to this page" : ""}
              </span>

              <div className="txn-pagination-actions">
                <button
                  type="button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || loading}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
