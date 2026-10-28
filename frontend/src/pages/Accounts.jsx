
import { useState } from "react";
import axios from "axios";
import {
  Wallet,
  Search,
  Copy,
  UserRound,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import "./Accounts.css";

const API_URL = "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Backend stores paise. This function formats paise as INR.
function formatINR(paise) {
  const amount = Number(paise);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

// Backend account creation uses data.account_id.
function getAccountId(response) {
  const data = response?.data ?? response;

  return (
    data?.account_id ||
    data?.accountId ||
    data?.account?._id ||
    data?._id ||
    ""
  );
}

function Accounts() {
  const [accountId, setAccountId] = useState("");
  const [account, setAccount] = useState(null);
  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function getErrorMessage(err) {
    if (err.response?.data?.message) {
      return err.response.data.message;
    }

    if (err.code === "ECONNABORTED") {
      return "Request timed out. Please try again.";
    }

    if (!err.response) {
      return "Cannot connect to the backend. Check your server.";
    }

    return err.message || "Something went wrong.";
  }

  // Load an account using its MongoDB ObjectId.
  async function loadAccount(id = accountId) {
    const cleanId = String(id).trim();

    if (!cleanId) {
      setError("Please enter an Account ID.");
      return;
    }

    if (!/^[a-fA-F0-9]{24}$/.test(cleanId)) {
      setError("Please enter a valid 24-character Account ID.");
      return;
    }

    setLoading(true);
    clearMessages();
    setAccount(null);

    try {
      const response = await api.get(
        `/accounts/${encodeURIComponent(cleanId)}/balance`
      );

      // Expected backend response:
      // {
      //   success: true,
      //   data: {
      //     account_id: "...",
      //     name: "Sathish Kumar",
      //     balance: 70
      //   }
      // }

      const data = response.data?.data;

      if (!data || typeof data !== "object") {
        throw new Error("Invalid account response from server.");
      }

      const balanceRupees = Number(data.balance);

      if (
        data.balance === undefined ||
        data.balance === null ||
        !Number.isFinite(balanceRupees) ||
        balanceRupees < 0
      ) {
        throw new Error("Invalid account balance received.");
      }

      const returnedId = data.account_id || cleanId;

      // API balance is RUPEES.
      // Convert it back to paise for the display formatter.
      const balancePaise = Math.round(balanceRupees * 100);

      setAccount({
        id: returnedId,
        name: data.name || "",
        balancePaise,
      });

      setAccountId(returnedId);
      setSuccess("Account loaded successfully.");
    } catch (err) {
      console.error(
        "Load account failed:",
        err.response?.data || err
      );

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Create a new account.
  async function createAccount(e) {
    e.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Please enter the account holder's name.");
      return;
    }

    if (cleanName.length > 120) {
      setError("Account name cannot exceed 120 characters.");
      return;
    }

    setCreating(true);
    clearMessages();
    setAccount(null);

    let createdId = "";

    try {
      const response = await api.post("/accounts", {
        name: cleanName,
      });

      createdId = getAccountId(response.data);

      if (!createdId) {
        throw new Error(
          "Account created, but Account ID was not found in the response."
        );
      }

      setAccountId(createdId);
      setName("");
      setSuccess("Account created successfully.");

      // Load the new account.
      // This is a separate request, so it can fail independently.
      try {
        const balanceResponse = await api.get(
          `/accounts/${encodeURIComponent(createdId)}/balance`
        );

        const data = balanceResponse.data?.data;
        const balance = Number(data?.balance);

        if (
          !data ||
          data.balance === undefined ||
          data.balance === null ||
          !Number.isFinite(balance) ||
          balance < 0
        ) {
          throw new Error("Invalid account balance response.");
        }

        setAccount({
          id: data.account_id || createdId,
          name: data.name || cleanName,
          balancePaise: Math.round(balance * 100),
        });

        setAccountId(data.account_id || createdId);
      } catch (balanceErr) {
        console.error(
          "Account created, but loading its balance failed:",
          balanceErr.response?.data || balanceErr
        );

        // Creation succeeded. Do not report creation as failed.
        setSuccess(
          "Account created successfully. You can load it using its Account ID."
        );
      }
    } catch (err) {
      console.error(
        "Create account failed:",
        err.response?.data || err
      );

      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function copyAccountId() {
    if (!account?.id) return;

    try {
      await navigator.clipboard.writeText(account.id);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError(
        "Unable to copy Account ID. Please copy it manually."
      );
    }
  }

  return (
    <div className="accounts-page">
      {/* Page Header */}
      <div className="accounts-heading">
        <div>
          <span className="accounts-eyebrow">
            LEDGER MANAGEMENT
          </span>

          <h1>Accounts</h1>

          <p>Manage and access your ledger accounts.</p>
        </div>

        <div className="accounts-heading-icon">
          <Wallet size={25} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="accounts-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="accounts-alert success" role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Forms */}
      <div className="accounts-grid">
        {/* Create Account */}
        <section className="accounts-card">
          <div className="accounts-card-heading">
            <div className="accounts-card-icon create-icon">
              <Plus size={22} />
            </div>

            <div>
              <h2>Create Account</h2>
              <p>Open a new ledger account</p>
            </div>
          </div>

          <form onSubmit={createAccount}>
            <label htmlFor="holderName">
              Account Holder Name
            </label>

            <input
              id="holderName"
              type="text"
              placeholder="Enter account holder name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              autoComplete="name"
              required
            />

            <button
              className="accounts-primary-btn"
              type="submit"
              disabled={creating || loading}
            >
              {creating ? (
                <>
                  <RefreshCw className="spin" size={18} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>
        </section>

        {/* Find Account */}
        <section className="accounts-card">
          <div className="accounts-card-heading">
            <div className="accounts-card-icon search-icon">
              <Search size={22} />
            </div>

            <div>
              <h2>Find Account</h2>
              <p>Access an existing account</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadAccount();
            }}
          >
            <label htmlFor="accountId">
              Account ID
            </label>

            <input
              id="accountId"
              type="text"
              placeholder="Paste your MongoDB Account ID"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
            />

            <button
              className="accounts-primary-btn"
              type="submit"
              disabled={loading || creating}
            >
              {loading ? (
                <>
                  <RefreshCw className="spin" size={18} />
                  Loading...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Load Account
                </>
              )}
            </button>
          </form>
        </section>
      </div>

      {/* Account Details */}
      <section className="accounts-card account-details">
        <div className="accounts-section-title">
          <div>
            <h2>Account Details</h2>
            <p>Account information and current balance</p>
          </div>

          <Wallet size={24} />
        </div>

        {account ? (
          <>
            {/* Profile */}
            <div className="account-profile">
              <div className="account-avatar">
                <UserRound size={27} />
              </div>

              <div className="account-profile-info">
                <span className="detail-label">
                  ACCOUNT HOLDER
                </span>

                <h3>{account.name || "Account holder"}</h3>

                <span className="account-status">
                  <span className="status-dot" />
                  Account loaded
                </span>
              </div>
            </div>

            {/* Account ID */}
            <div className="account-detail-box">
              <div className="account-id-content">
                <span className="detail-label">
                  ACCOUNT ID
                </span>

                <p className="account-id-text">
                  {account.id}
                </p>
              </div>

              <button
                type="button"
                className="copy-account-btn"
                onClick={copyAccountId}
                title="Copy Account ID"
              >
                {copied ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Copy size={18} />
                )}

                {copied ? "Copied" : "Copy ID"}
              </button>
            </div>

            {/* Balance */}
            <div className="account-balance-box">
              <span>AVAILABLE BALANCE</span>

              <h2>
                {formatINR(account.balancePaise)}
              </h2>

              <p>Current account balance</p>
            </div>

            {/* Refresh */}
            <div className="account-actions">
              <button
                type="button"
                className="accounts-secondary-btn"
                disabled={loading || creating}
                onClick={() => loadAccount(account.id)}
              >
                <RefreshCw
                  size={17}
                  className={loading ? "spin" : ""}
                />
                Refresh Balance
              </button>
            </div>
          </>
        ) : (
          <div className="accounts-empty">
            <div className="empty-wallet">
              <Wallet size={35} />
            </div>

            <h3>No account selected</h3>

            <p>
              Create a new account or enter an existing
              Account ID to view its details.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Accounts;
