import { useCallback, useEffect, useState } from "react";
import {
  acknowledgeCreditNotifications,
  createCreditPaymentOrder,
  createCreditRequest,
  getCreditWallet,
  verifyCreditPayment,
} from "../../api/credits";
import Alert from "../common/Alert";
import Modal from "../common/Modal";

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}

export default function FacultyCreditsPanel({ token, userId }) {
  const [creditData, setCreditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestAmount, setRequestAmount] = useState("100");
  const [requestReason, setRequestReason] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("100");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [newCredits, setNewCredits] = useState([]);
  const [acknowledging, setAcknowledging] = useState(false);

  const loadWallet = useCallback(async () => {
    const response = await getCreditWallet(token);
    setCreditData(response?.data || null);
    if (response?.data?.new_credits?.length) {
      setNewCredits(response.data.new_credits);
    }
    return response?.data || null;
  }, [token]);

  useEffect(() => {
    let active = true;
    getCreditWallet(token)
      .then((response) => {
        if (active) {
          setCreditData(response?.data || null);
          setNewCredits(response?.data?.new_credits || []);
        }
      })
      .catch((error) => {
        if (active) setFeedback({ type: "error", message: error.message || "Unable to load your credits" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, userId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadWallet().catch((error) => {
        setFeedback({ type: "error", message: error.message || "Unable to refresh your credits" });
      });
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [loadWallet]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadWallet();
      setFeedback(null);
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to refresh your credits" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequest = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await createCreditRequest(token, Number(requestAmount), requestReason);
      setRequestReason("");
      setShowRequestForm(false);
      await loadWallet();
      setFeedback({ type: "success", message: "Your credit request was sent to the administrator." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to submit your credit request" });
    } finally {
      setBusy(false);
    }
  };

  const handlePurchase = async (event) => {
    event.preventDefault();
    setBusy(true);
    let checkoutOpened = false;
    try {
      const response = await createCreditPaymentOrder(token, Number(purchaseAmount));
      const order = response.data;
      await loadRazorpayCheckout();
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Smart Campus",
        description: `${order.credits} faculty credits`,
        order_id: order.order_id,
        handler: async (paymentDetails) => {
          try {
            await verifyCreditPayment(token, paymentDetails);
            await loadWallet();
            setFeedback({ type: "success", message: "Payment verified and credits added to your wallet." });
          } catch (error) {
            setFeedback({
              type: "error",
              message: error.message || "Payment verification failed. Contact the administrator before paying again.",
            });
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on("payment.failed", () => {
        setFeedback({ type: "error", message: "Payment was not completed; no credits were added." });
        setBusy(false);
      });
      checkout.open();
      checkoutOpened = true;
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to start the credit payment" });
    } finally {
      if (!checkoutOpened) setBusy(false);
    }
  };

  const handleDismissNewCredits = async () => {
    if (acknowledging || newCredits.length === 0) return;
    setAcknowledging(true);
    try {
      await acknowledgeCreditNotifications(
        token,
        newCredits.map((credit) => credit.ledger_id),
      );
      setNewCredits([]);
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to dismiss the credit notification" });
    } finally {
      setAcknowledging(false);
    }
  };

  const mode = creditData?.settings?.acquisition_mode;
  const canRequest = mode === "REQUEST_ONLY" || mode === "REQUEST_OR_PAY";
  const purchaseGatewayAvailable = (mode === "PAY_ONLY" || mode === "REQUEST_OR_PAY") &&
    creditData?.settings?.razorpay_enabled &&
    creditData?.settings?.razorpay_configured;
  const canPurchase = purchaseGatewayAvailable &&
    Number(creditData?.settings?.price_per_credit) > 0;
  const purchaseModeSelected = mode === "PAY_ONLY" || mode === "REQUEST_OR_PAY";
  const hasPendingRequest = creditData?.requests?.some((request) => request.status === "PENDING");
  const newCreditTotal = newCredits.reduce((total, credit) => total + Number(credit.amount), 0);

  return (
    <>
      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}
      <section className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-indigo-950">Quiz credit wallet</h2>
            {loading ? (
              <p className="mt-1 text-sm text-indigo-800">Loading your credit balance...</p>
            ) : creditData ? (
              <>
                <p className="mt-1 text-lg font-bold text-indigo-950">
                  {Number(creditData.wallet?.balance ?? 0)} credits available
                </p>
                <p className="mt-1 max-w-3xl text-xs text-indigo-800">
                  AI quiz generation is planned at {creditData.settings?.generation_cost ?? 20} credits per quiz. Manual quizzes and questions remain free.
                </p>
                {creditData.settings?.razorpay_test_mode && (
                  <p className="mt-1 text-xs font-semibold text-amber-800">Razorpay test mode is enabled.</p>
                )}
                {hasPendingRequest && (
                  <p className="mt-1 text-xs font-semibold text-amber-800">Your credit request is waiting for administrator review.</p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-rose-700">Credit balance could not be loaded. Refresh to try again.</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            {canRequest && !hasPendingRequest && (
              <button
                type="button"
                onClick={() => setShowRequestForm((shown) => !shown)}
                className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
              >
                {showRequestForm ? "Close request" : "Request credits"}
              </button>
            )}
          </div>
        </div>

        {showRequestForm && (
          <form onSubmit={handleRequest} className="mt-4 grid gap-3 border-t border-indigo-200 pt-4 sm:grid-cols-[1fr_2fr_auto]">
            <input
              type="number"
              min={creditData?.settings?.request_min_amount ?? 1}
              max={creditData?.settings?.request_max_amount ?? 500}
              required
              value={requestAmount}
              onChange={(event) => setRequestAmount(event.target.value)}
              aria-label="Credit request amount"
              placeholder="Credits requested"
              className="rounded-lg border border-indigo-200 px-3 py-2 text-xs"
            />
            <input
              type="text"
              maxLength="200"
              required
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              aria-label="Reason for credit request"
              placeholder="Reason for requesting credits"
              className="rounded-lg border border-indigo-200 px-3 py-2 text-xs"
            />
            <button type="submit" disabled={busy} className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
              {busy ? "Sending..." : "Send request"}
            </button>
          </form>
        )}

        {purchaseGatewayAvailable ? (
          <form onSubmit={handlePurchase} className="mt-4 grid gap-3 border-t border-indigo-200 pt-4 sm:grid-cols-[1fr_auto_auto]">
            <label className="text-xs font-semibold text-indigo-950">
              Credits to buy
              <input
                type="number"
                min={creditData.settings?.request_min_amount ?? 1}
                max={creditData.settings?.request_max_amount ?? 500}
                step="1"
                required
                value={purchaseAmount}
                onChange={(event) => setPurchaseAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs"
              />
            </label>
            <p className="self-end pb-2 text-xs text-indigo-900">
              {Number(creditData.settings?.price_per_credit) <= 0
                ? "Administrator must set the credit price"
                : Number(purchaseAmount) > 0
                ? formatPrice(Number(purchaseAmount) * Number(creditData.settings?.price_per_credit || 0))
                : "Enter a valid credit amount"}
            </p>
            <button type="submit" disabled={busy || !canPurchase} className="self-end rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
              {busy ? "Processing..." : "Buy credits"}
            </button>
          </form>
        ) : purchaseModeSelected && (
          <p className="mt-3 border-t border-indigo-200 pt-3 text-xs text-amber-800">
            {!creditData?.settings?.razorpay_enabled || !creditData?.settings?.razorpay_configured
              ? "Credit purchases are not ready. Contact the administrator to enable Razorpay."
              : "The administrator must set a positive per-credit price before purchases are available."}
          </p>
        )}
      </section>

      <Modal
        isOpen={newCredits.length > 0}
        onClose={handleDismissNewCredits}
        title="Credits added to your wallet"
        closeOnEscape={!acknowledging}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            {newCreditTotal} credits have been added to your wallet. Your balance is now {Number(newCredits.at(-1)?.balance_after ?? creditData?.wallet?.balance ?? 0)} credits.
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            {newCredits.map((credit) => (
              <li key={credit.ledger_id}>
                +{Number(credit.amount)} credits — {credit.reason || "Credit allocation"}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleDismissNewCredits}
            disabled={acknowledging}
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
          >
            {acknowledging ? "Saving..." : "Got it"}
          </button>
        </div>
      </Modal>
    </>
  );
}
