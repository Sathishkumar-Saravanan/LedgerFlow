
import { useState } from "react";
import {
  ArrowLeftRight,
  ShieldCheck,
  CircleCheck,
  CircleAlert,
  LoaderCircle,
  Copy,
  ArrowLeft,
  Wallet,
  ReceiptText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getBalance,
  verifyRecipient,
  transferMoney,
  getTransferReceipt,
} from "../api/api";

import "./TransferMoney.css";

const getAccountId = () =>
  localStorage.getItem("ledgerflowAccountId")?.trim() || "";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item) => item.message || item.msg || String(item))
      .join(", ");
  }

  return (
    data?.message ||
    data?.error ||
    error?.message ||
    "Transfer could not be completed."
  );
};

function TransferMoney() {
  const navigate = useNavigate();

  const [senderAccountId] = useState(getAccountId);

  const [recipientAccountId, setRecipientAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");

  const [senderBalance, setSenderBalance] = useState(null);
  const [recipient, setRecipient] = useState(null);

  const [loadingBalance, setLoadingBalance] = useState(false);
  const [verifyingRecipient, setVerifyingRecipient] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState("form");
  const [errorMessage, setErrorMessage] = useState("");
  const [receipt, setReceipt] = useState(null);

  // Preserve the same key and exact payload during retries.
  const [pendingRequest, setPendingRequest] = useState(null);

  // =====================================
  // LOAD SENDER BALANCE
  // =====================================

  const loadSenderBalance = async () => {
    if (!senderAccountId) {
      setErrorMessage(
        "No active sender account found. Select or load an account first."
      );
      return;
    }

    setLoadingBalance(true);
    setErrorMessage("");

    try {
      const response = await getBalance(senderAccountId);

      const balance = response.data?.data?.balance;

      if (!Number.isFinite(Number(balance))) {
        throw new Error("Invalid account balance response");
      }

      setSenderBalance(Number(balance));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingBalance(false);
    }
  };

  // =====================================
  // VERIFY RECIPIENT
  // =====================================

  const handleVerifyRecipient = async () => {
    const recipientId = recipientAccountId.trim();

    if (!recipientId) {
      setErrorMessage("Enter the recipient account ID.");
      return;
    }

    if (!/^[a-fA-F0-9]{24}$/.test(recipientId)) {
      setErrorMessage("Enter a valid 24-character account ID.");
      return;
    }

    if (
      senderAccountId &&
      recipientId.toLowerCase() === senderAccountId.toLowerCase()
    ) {
      setErrorMessage("You cannot transfer money to your own account.");
      return;
    }

    setVerifyingRecipient(true);
    setErrorMessage("");
    setRecipient(null);
    setPendingRequest(null);

    try {
      const response = await verifyRecipient(recipientId);
      const data = response.data?.data;

      if (!data || !Number.isFinite(Number(data.balance))) {
        throw new Error("Recipient verification returned invalid data.");
      }

      setRecipient({
        accountId: recipientId,
        name: data.name || "Verified recipient",
        balance: Number(data.balance),
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setVerifyingRecipient(false);
    }
  };

  // =====================================
  // VALIDATE AND PREPARE REVIEW
  // =====================================

  const handleReview = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!senderAccountId) {
      setErrorMessage("Please load your sender account first.");
      return;
    }

    if (!recipient) {
      setErrorMessage("Verify the recipient account first.");
      return;
    }

    if (
      recipient.accountId.toLowerCase() !==
      recipientAccountId.trim().toLowerCase()
    ) {
      setErrorMessage("Recipient changed. Verify the account again.");
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      setErrorMessage("Enter a valid amount with up to 2 decimals.");
      return;
    }

    const amountInPaise = Math.round(Number(amount) * 100);

    if (
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      setErrorMessage("Enter a valid positive transfer amount.");
      return;
    }

    if (
      !description.trim() ||
      description.trim().length > 500
    ) {
      setErrorMessage("Description is required (maximum 500 characters).");
      return;
    }

    if (
      !referenceId.trim() ||
      referenceId.trim().length > 150
    ) {
      setErrorMessage("Reference ID is required (maximum 150 characters).");
      return;
    }

    // Refresh sender balance before review.
    setLoadingBalance(true);

    try {
      const response = await getBalance(senderAccountId);
      const currentBalance = Number(response.data?.data?.balance);

      if (!Number.isFinite(currentBalance)) {
        throw new Error("Unable to retrieve current sender balance.");
      }

      setSenderBalance(currentBalance);

      if (currentBalance * 100 < amountInPaise) {
        setErrorMessage("Insufficient sender balance.");
        return;
      }

      // Exact field names required by transferController.js
      const payload = {
        fromAccountId: senderAccountId,
        toAccountId: recipient.accountId,
        amount: Number(amount),
        description: description.trim(),
        referenceId: referenceId.trim(),
      };

      // New key for a new transfer intent.
      const idempotencyKey = crypto.randomUUID();

      setPendingRequest({
        payload,
        idempotencyKey,
      });

      setStep("review");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingBalance(false);
    }
  };

  // =====================================
  // CONFIRM TRANSFER
  // =====================================

  const handleConfirmTransfer = async () => {
    if (!pendingRequest || submitting) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      // Use the exact payload and key prepared for this intent.
      const response = await transferMoney(
        pendingRequest.payload,
        pendingRequest.idempotencyKey
      );

      const data = response.data?.data;

      if (!data?.transfer_id) {
        throw new Error(
          "Transfer response is missing its receipt ID. Verify transfer status before retrying."
        );
      }

      setReceipt(data);
      setStep("receipt");
      setPendingRequest(null);

      // Refresh sender balance after success.
      try {
        const balanceResponse = await getBalance(senderAccountId);

        setSenderBalance(
          Number(balanceResponse.data?.data?.balance)
        );
      } catch {
        // Transfer already succeeded.
      }
    } catch (error) {
      const status = error.response?.status;

      if (!error.response || status >= 500 || status === 408) {
        setErrorMessage(
          "Transfer outcome may be unknown. Verify transfer status before retrying. Do not create a new transfer."
        );
      } else {
        setErrorMessage(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================
  // VERIFY TRANSFER RECEIPT
  // =====================================

  const handleVerifyStatus = async () => {
    if (!pendingRequest) {
      setErrorMessage(
        "No pending transfer request is available to retry safely."
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      // First, retry the identical request with its original key.
      // Backend idempotency must safely return an existing result
      // or report that status needs reconciliation.
      const response = await transferMoney(
        pendingRequest.payload,
        pendingRequest.idempotencyKey
      );

      const data = response.data?.data;

      if (!data?.transfer_id) {
        setErrorMessage(
          "Transfer status is still unresolved. Contact support before creating another transfer."
        );
        return;
      }

      setReceipt(data);
      setStep("receipt");
      setPendingRequest(null);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error) +
          ". If the outcome is uncertain, do not create a new transfer."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================
  // OPEN RECEIPT
  // =====================================

  const handleOpenReceipt = async () => {
    if (!receipt?.transfer_id) return;

    try {
      const response = await getTransferReceipt(receipt.transfer_id);

      setReceipt(response.data?.data || receipt);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  // =====================================
  // COPY RECEIPT ID
  // =====================================

  const handleCopyReceipt = async () => {
    if (!receipt?.transfer_id) return;

    try {
      await navigator.clipboard.writeText(receipt.transfer_id);
    } catch {
      setErrorMessage("Unable to copy receipt ID.");
    }
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="transfer-page">
      <div className="transfer-page-header">
        <div>
          <p className="transfer-eyebrow">
            LEDGERFLOW / PAYMENTS
          </p>

          <h1>Transfer Money</h1>

          <p className="transfer-subtitle">
            Send money to another LedgerFlow account.
          </p>
        </div>

        <div className="transfer-header-icon">
          <ArrowLeftRight size={28} />
        </div>
      </div>

      {errorMessage && (
        <div className="transfer-alert" role="alert">
          <CircleAlert size={20} />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="transfer-layout">
        <section className="transfer-main-card">
          {step === "form" && (
            <>
              <div className="transfer-section-heading">
                <div className="transfer-heading-icon">
                  <ArrowLeftRight size={24} />
                </div>

                <div>
                  <h2>Transfer Details</h2>
                  <p>Enter and verify your payment details.</p>
                </div>
              </div>

              <div className="transfer-account-summary">
                <div className="transfer-field-label">
                  From account
                </div>

                <strong className="transfer-account-id">
                  {senderAccountId || "No active account"}
                </strong>

                <div className="transfer-balance-row">
                  <span>
                    Available balance:{" "}
                    {senderBalance === null
                      ? "Not loaded"
                      : formatINR(senderBalance)}
                  </span>

                  <button
                    type="button"
                    className="transfer-text-button"
                    onClick={loadSenderBalance}
                    disabled={loadingBalance}
                  >
                    {loadingBalance ? "Loading..." : "Refresh"}
                  </button>
                </div>
              </div>

              <form onSubmit={handleReview}>
                <div className="transfer-form-group">
                  <label htmlFor="recipientAccountId">
                    Recipient Account ID
                  </label>

                  <div className="transfer-input-action">
                    <input
                      id="recipientAccountId"
                      type="text"
                      value={recipientAccountId}
                      onChange={(event) => {
                        setRecipientAccountId(event.target.value);
                        setRecipient(null);
                        setPendingRequest(null);
                      }}
                      placeholder="Enter recipient account ID"
                      maxLength={24}
                      autoComplete="off"
                      required
                    />

                    <button
                      type="button"
                      onClick={handleVerifyRecipient}
                      disabled={verifyingRecipient}
                      className="transfer-secondary-button"
                    >
                      {verifyingRecipient
                        ? "Verifying..."
                        : "Verify"}
                    </button>
                  </div>
                </div>

                {recipient && (
                  <div className="transfer-recipient-card">
                    <CircleCheck size={22} />

                    <div>
                      <strong>{recipient.name}</strong>
                      <p>
                        Verified account: {recipient.accountId}
                      </p>
                    </div>
                  </div>
                )}

                <div className="transfer-form-group">
                  <label htmlFor="transferAmount">
                    Amount (INR)
                  </label>

                  <div className="transfer-amount-input">
                    <span>₹</span>
                    <input
                      id="transferAmount"
                      type="number"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setPendingRequest(null);
                      }}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="transfer-form-group">
                  <label htmlFor="transferDescription">
                    Description
                  </label>

                  <input
                    id="transferDescription"
                    type="text"
                    value={description}
                    onChange={(event) => {
                      setDescription(event.target.value);
                      setPendingRequest(null);
                    }}
                    placeholder="e.g. Personal transfer"
                    maxLength={500}
                    required
                  />
                </div>

                <div className="transfer-form-group">
                  <label htmlFor="transferReference">
                    Reference ID
                  </label>

                  <input
                    id="transferReference"
                    type="text"
                    value={referenceId}
                    onChange={(event) => {
                      setReferenceId(event.target.value);
                      setPendingRequest(null);
                    }}
                    placeholder="Enter a unique reference ID"
                    maxLength={150}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="transfer-primary-button"
                  disabled={
                    loadingBalance ||
                    verifyingRecipient ||
                    !recipient
                  }
                >
                  Review Transfer
                  <ArrowLeftRight size={18} />
                </button>
              </form>
            </>
          )}

          {step === "review" && pendingRequest && (
            <>
              <div className="transfer-section-heading">
                <div className="transfer-heading-icon">
                  <ArrowLeftRight size={24} />
                </div>

                <div>
                  <h2>Review Transfer</h2>
                  <p>Check the details before confirming.</p>
                </div>
              </div>

              <div className="transfer-amount-summary">
                <span>You're sending</span>
                <strong>
                  {formatINR(pendingRequest.payload.amount)}
                </strong>
              </div>

              <div className="transfer-detail-row">
                <span>From account</span>
                <strong>
                  {pendingRequest.payload.fromAccountId}
                </strong>
              </div>

              <div className="transfer-detail-row">
                <span>Recipient</span>
                <strong>{recipient?.name || "Verified recipient"}</strong>
              </div>

              <div className="transfer-detail-row">
                <span>Recipient Account ID</span>
                <strong>
                  {pendingRequest.payload.toAccountId}
                </strong>
              </div>

              <div className="transfer-detail-row">
                <span>Description</span>
                <strong>
                  {pendingRequest.payload.description}
                </strong>
              </div>

              <div className="transfer-detail-row">
                <span>Reference ID</span>
                <strong>
                  {pendingRequest.payload.referenceId}
                </strong>
              </div>

              <div className="transfer-review-warning">
                <ShieldCheck size={21} />
                <p>
                  Verify the recipient and amount carefully.
                  Transfers may not be reversible.
                </p>
              </div>

              <div className="transfer-button-row">
                <button
                  type="button"
                  className="transfer-secondary-button"
                  disabled={submitting}
                  onClick={() => setStep("form")}
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <button
                  type="button"
                  className="transfer-primary-button"
                  onClick={handleConfirmTransfer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={18} />
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm Transfer
                      <ArrowLeftRight size={18} />
                    </>
                  )}
                </button>
              </div>

              {errorMessage && (
                <button
                  type="button"
                  className="transfer-secondary-button"
                  disabled={submitting}
                  onClick={handleVerifyStatus}
                >
                  Verify / Retry Same Request
                </button>
              )}
            </>
          )}

          {step === "receipt" && receipt && (
            <>
              <div className="transfer-success-heading">
                <CircleCheck size={48} />
                <h2>Transfer Completed</h2>
                <p>Your transfer confirmation is available.</p>
              </div>

              <div className="transfer-amount-summary">
                <span>Transfer amount</span>
                <strong>
                  {formatINR(receipt.amount)}
                </strong>
              </div>

              <div className="transfer-detail-row">
                <span>Transfer ID</span>
                <strong>{receipt.transfer_id}</strong>
              </div>

              <div className="transfer-detail-row">
                <span>Status</span>
                <strong>{receipt.status}</strong>
              </div>

              <div className="transfer-detail-row">
                <span>Reference ID</span>
                <strong>{receipt.reference_id}</strong>
              </div>

              <div className="transfer-detail-row">
                <span>Recipient account</span>
                <strong>{receipt.to_account_id}</strong>
              </div>

              <div className="transfer-button-row">
                <button
                  type="button"
                  className="transfer-secondary-button"
                  onClick={handleCopyReceipt}
                >
                  <Copy size={17} />
                  Copy Receipt ID
                </button>

                <button
                  type="button"
                  className="transfer-primary-button"
                  onClick={handleOpenReceipt}
                >
                  <ReceiptText size={18} />
                  Refresh Receipt
                </button>
              </div>

              <button
                type="button"
                className="transfer-secondary-button"
                onClick={() => navigate("/transactions")}
              >
                View Transactions
              </button>
            </>
          )}
        </section>

        <aside className="transfer-side-panel">
          <div className="transfer-info-card">
            <div className="transfer-heading-icon">
              <ShieldCheck size={25} />
            </div>

            <h3>Safe transfers</h3>

            <p>
              Review the account details and amount before
              confirming your transfer.
            </p>

            <div className="transfer-check-list">
              {[
                "Account verification",
                "Balance validation",
                "Linked ledger entries",
                "Transfer receipt",
              ].map((item) => (
                <div key={item}>
                  <CircleCheck size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="transfer-info-card transfer-help-card">
            <h3>Transfer help</h3>

            <p>
              Use the correct recipient account ID. If you are
              unsure, verify it with the recipient before sending.
            </p>

            <p>
              Never share your password, authentication codes,
              or sensitive account credentials.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default TransferMoney;
