import { useCallback, useEffect, useState } from "react";
import {
  decideCreditRequest,
  createCreditPoolPaymentOrder,
  getCreditAdminOverview,
  grantFacultyCredits,
  updateCreditSettings,
  verifyCreditPoolPayment,
} from "../../api/credits";
import Alert from "../common/Alert";
import LoadingSpinner from "../common/LoadingSpinner";

const initialSettings = {
  acquisition_mode: "REQUEST_ONLY",
  initial_credits: 100,
  generation_cost: 20,
  price_per_credit: "",
  razorpay_enabled: false,
  razorpay_configured: false,
  razorpay_test_mode: false,
  credit_pool_balance: 0,
  request_max_amount: 500,
};

export default function CreditManagementView({ token }) {
  const [settings, setSettings] = useState(initialSettings);
  const [wallets, setWallets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [granting, setGranting] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [grantTarget, setGrantTarget] = useState(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [poolPurchaseAmount, setPoolPurchaseAmount] = useState("500");
  const [buyingPoolCredits, setBuyingPoolCredits] = useState(false);

  const applyOverview = useCallback((response) => {
    setSettings({
      ...initialSettings,
      ...response.data.settings,
      price_per_credit: Number(response.data.settings.price_per_credit) > 0
        ? response.data.settings.price_per_credit
        : "",
    });
    setWallets(response.data.wallets || []);
    setRequests(response.data.pending_requests || []);
    setFeedback(null);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCreditAdminOverview(token);
      applyOverview(response);
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to load credit management data" });
    } finally {
      setLoading(false);
    }
  }, [applyOverview, token]);

  useEffect(() => {
    let active = true;
    getCreditAdminOverview(token)
      .then((response) => {
        if (active) applyOverview(response);
      })
      .catch((error) => {
        if (active) {
          setFeedback({ type: "error", message: error.message || "Unable to load credit management data" });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyOverview, token]);

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateCreditSettings(token, {
        ...settings,
        initial_credits: Number(settings.initial_credits),
        generation_cost: Number(settings.generation_cost),
        price_per_credit: settings.price_per_credit === "" ? null : Number(settings.price_per_credit),
        razorpay_enabled: Boolean(settings.razorpay_enabled),
      });
      setFeedback({ type: "success", message: "Credit policy saved. New faculty will receive the configured initial balance." });
      await loadData();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to save credit policy" });
    } finally {
      setSaving(false);
    }
  };

  const handleGrant = async (event) => {
    event.preventDefault();
    if (!grantTarget) return;
    setGranting(true);
    try {
      await grantFacultyCredits(token, grantTarget.faculty_id, Number(grantAmount), grantReason);
      setFeedback({ type: "success", message: `Credits granted to ${grantTarget.full_name}.` });
      setGrantTarget(null);
      setGrantAmount("");
      setGrantReason("");
      await loadData();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to grant credits" });
    } finally {
      setGranting(false);
    }
  };

  const handleDecision = async (request, decision) => {
    setBusyRequestId(request.request_id);
    try {
      await decideCreditRequest(token, request.request_id, decision);
      setFeedback({
        type: "success",
        message: decision === "APPROVED"
          ? `${request.amount} credits granted to ${request.full_name}.`
          : `Credit request from ${request.full_name} rejected.`,
      });
      await loadData();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to update credit request" });
    } finally {
      setBusyRequestId(null);
    }
  };

  const handlePoolPurchase = async (event) => {
    event.preventDefault();
    setBuyingPoolCredits(true);
    let checkoutOpened = false;
    try {
      const response = await createCreditPoolPaymentOrder(token, Number(poolPurchaseAmount));
      const order = response.data;
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
          document.body.appendChild(script);
        });
      }

      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Smart Campus",
        description: `${order.credits} credits for faculty distribution`,
        order_id: order.order_id,
        handler: async (paymentDetails) => {
          try {
            const result = await verifyCreditPoolPayment(token, paymentDetails);
            setSettings((current) => ({
              ...current,
              credit_pool_balance: result.data.pool_balance,
            }));
            setFeedback({ type: "success", message: `${result.data.credits_added} credits added to the distribution pool.` });
            await loadData();
          } catch (error) {
            setFeedback({ type: "error", message: error.message || "Unable to verify the pool payment" });
          } finally {
            setBuyingPoolCredits(false);
          }
        },
        modal: { ondismiss: () => setBuyingPoolCredits(false) },
      });
      checkout.on("payment.failed", () => {
        setFeedback({ type: "error", message: "Pool payment was not completed; no credits were added." });
        setBuyingPoolCredits(false);
      });
      checkout.open();
      checkoutOpened = true;
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to start the pool payment" });
    } finally {
      if (!checkoutOpened) setBuyingPoolCredits(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Faculty Quiz Credits</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage the credit policy, review faculty requests, and allocate credits. Manually authored quizzes and questions do not use credits.
          </p>
        </div>
        <form onSubmit={handleSaveSettings} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">
            Credit acquisition
            <select
              value={settings.acquisition_mode}
              onChange={(event) => setSettings({ ...settings, acquisition_mode: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            >
              <option value="REQUEST_ONLY">Request credits from admin</option>
              <option value="PAY_ONLY" disabled={!settings.razorpay_configured}>
                Pay using Razorpay
              </option>
              <option value="REQUEST_OR_PAY">
                Allow requests and Razorpay purchases
              </option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Initial credits for new faculty
            <input
              type="number"
              min="0"
              max="1000000"
              required
              value={settings.initial_credits}
              onChange={(event) => setSettings({ ...settings, initial_credits: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Credits per AI quiz
            <input
              type="number"
              min="1"
              max="1000000"
              required
              value={settings.generation_cost}
              onChange={(event) => setSettings({ ...settings, generation_cost: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Price per credit (INR)
            <input
              type="number"
              min={settings.razorpay_enabled ? "0.01" : "0"}
              required={settings.razorpay_enabled}
              step="0.01"
              value={settings.price_per_credit}
              onChange={(event) => setSettings({ ...settings, price_per_credit: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(settings.razorpay_enabled)}
                disabled={!settings.razorpay_configured}
                onChange={(event) => setSettings({
                  ...settings,
                  razorpay_enabled: event.target.checked,
                })}
                className="h-4 w-4 rounded border-gray-300 text-green-700 focus:ring-green-700 disabled:opacity-50"
              />
              Enable Razorpay payments
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save credit policy"}
            </button>
            {!settings.razorpay_configured && (
              <p className="text-sm text-amber-800">
                Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the backend environment, then restart the backend to enable checkout.
              </p>
            )}
            {settings.razorpay_configured && settings.razorpay_test_mode && (
              <p className="text-sm font-semibold text-amber-800">Razorpay is using test mode.</p>
            )}
            {settings.acquisition_mode === "PAY_ONLY" && !settings.razorpay_enabled && (
              <p className="text-sm text-amber-800">
                Enable Razorpay and set a positive per-credit price before saving pay-only mode.
              </p>
            )}
            <p className="text-xs text-gray-500">
              Changing the initial balance only affects newly created wallets; it does not change existing balances.
            </p>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Paid credit distribution pool</h3>
            <p className="mt-1 text-sm text-gray-700">
              Available to distribute: <span className="font-bold">{Number(settings.credit_pool_balance || 0)} credits</span>
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Pool purchases use the configured price per credit. Faculty requests and manual allocations are funded from this pool.
            </p>
          </div>
          {settings.razorpay_configured && settings.razorpay_enabled ? (
            <form onSubmit={handlePoolPurchase} className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-semibold text-gray-700">
                Credits to buy
                <input
                  type="number"
                  min="1"
                  max={settings.request_max_amount || 500}
                  step="1"
                  required
                  value={poolPurchaseAmount}
                  onChange={(event) => setPoolPurchaseAmount(event.target.value)}
                  className="mt-1 block w-32 rounded-lg border border-gray-300 bg-white px-3 py-2"
                />
              </label>
              <p className="pb-2 text-xs text-gray-700">
                {Number(settings.price_per_credit) <= 0
                  ? "Set a positive credit price above"
                  : Number(poolPurchaseAmount) > 0
                  ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
                    .format(Number(poolPurchaseAmount) * Number(settings.price_per_credit))
                  : ""}
              </p>
              <button
                type="submit"
                disabled={buyingPoolCredits || Number(settings.price_per_credit) <= 0}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {buyingPoolCredits ? "Processing..." : "Buy pool credits"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-amber-800">
              Enable Razorpay and set a per-credit price to fund the distribution pool.
            </p>
          )}
        </div>
      </section>

      {grantTarget && (
        <form onSubmit={handleGrant} className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900">Grant credits to {grantTarget.full_name}</h3>
            <button type="button" onClick={() => setGrantTarget(null)} className="text-sm text-gray-600 hover:text-gray-900">
              Cancel
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <input
              type="number"
              min="1"
              max="1000000"
              required
              value={grantAmount}
              onChange={(event) => setGrantAmount(event.target.value)}
              placeholder="Credits"
              aria-label="Credits to grant"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              type="text"
              required
              maxLength="500"
              value={grantReason}
              onChange={(event) => setGrantReason(event.target.value)}
              placeholder="Reason for this credit allocation"
              aria-label="Reason for credit allocation"
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <button type="submit" disabled={granting} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
              {granting ? "Granting..." : "Grant credits"}
            </button>
          </div>
        </form>
      )}

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-bold text-gray-900">Pending faculty requests ({requests.length})</h3>
        </div>
        {loading ? (
          <div className="p-8"><LoadingSpinner message="Loading faculty credit requests..." /></div>
        ) : requests.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">There are no pending credit requests.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((request) => (
              <div key={request.request_id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{request.full_name} <span className="font-normal text-gray-500">({request.employee_code || request.email})</span></p>
                  <p className="mt-1 text-sm text-gray-600">Requests {request.amount} credits — {request.reason}</p>
                  {Number(settings.credit_pool_balance) < Number(request.amount) && (
                    <p className="mt-1 text-xs font-semibold text-amber-800">
                      Buy more pool credits before approving this request.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busyRequestId === request.request_id || Number(settings.credit_pool_balance) < Number(request.amount)} onClick={() => handleDecision(request, "APPROVED")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                    {busyRequestId === request.request_id ? "Saving..." : "Approve"}
                  </button>
                  <button type="button" disabled={busyRequestId === request.request_id} onClick={() => handleDecision(request, "REJECTED")} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-bold text-gray-900">Faculty balances ({wallets.length})</h3>
        </div>
        {loading ? (
          <div className="p-8"><LoadingSpinner message="Loading faculty balances..." /></div>
        ) : wallets.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Faculty credit wallets will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Faculty</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Balance</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wallets.map((wallet) => (
                  <tr key={wallet.faculty_id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{wallet.full_name}</p>
                      <p className="text-xs text-gray-500">{wallet.employee_code || wallet.email}</p>
                    </td>
                    <td className="px-5 py-3">{wallet.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-5 py-3 font-semibold">{Number(wallet.balance)}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setGrantTarget(wallet);
                          setGrantAmount("");
                          setGrantReason("");
                        }}
                        className="rounded-lg border border-green-700 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-50"
                      >
                        Allocate credits
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
