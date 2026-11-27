import apiClient from "./client";

export function getCreditWallet(token) {
  return apiClient("/credits/wallet", { token });
}

export function getCreditAdminOverview(token) {
  return apiClient("/credits/admin/overview", { token });
}

export function createCreditRequest(token, amount, reason) {
  return apiClient("/credits/requests", {
    method: "POST",
    token,
    body: { amount, reason },
  });
}

export function createCreditPaymentOrder(token, amount) {
  return apiClient("/credits/payments/orders", {
    method: "POST",
    token,
    body: { amount },
  });
}

export function verifyCreditPayment(token, paymentDetails) {
  return apiClient("/credits/payments/verify", {
    method: "POST",
    token,
    body: paymentDetails,
  });
}

export function acknowledgeCreditNotifications(token, ledgerIds) {
  return apiClient("/credits/notifications/acknowledge", {
    method: "POST",
    token,
    body: { ledger_ids: ledgerIds },
  });
}

export function createCreditPoolPaymentOrder(token, amount) {
  return apiClient("/credits/admin/payments/orders", {
    method: "POST",
    token,
    body: { amount },
  });
}

export function verifyCreditPoolPayment(token, paymentDetails) {
  return apiClient("/credits/admin/payments/verify", {
    method: "POST",
    token,
    body: paymentDetails,
  });
}

export function updateCreditSettings(token, settings) {
  return apiClient("/credits/admin/settings", {
    method: "PUT",
    token,
    body: settings,
  });
}

export function grantFacultyCredits(token, facultyId, amount, reason) {
  return apiClient(`/credits/admin/wallets/${facultyId}/grant`, {
    method: "POST",
    token,
    body: { amount, reason },
  });
}

export function decideCreditRequest(token, requestId, decision, decision_note = "") {
  return apiClient(`/credits/admin/requests/${requestId}`, {
    method: "PUT",
    token,
    body: { decision, decision_note },
  });
}
