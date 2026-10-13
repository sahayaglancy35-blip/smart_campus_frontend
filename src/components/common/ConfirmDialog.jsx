import { ExclamationTriangleIcon, TrashIcon } from "@heroicons/react/24/outline";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  itemDetails = null,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  loading = false,
}) {
  const getButtonStyles = () => {
    switch (confirmVariant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white focus:ring-red-600";
      case "warning":
        return "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-600";
      case "primary":
      default:
        return "bg-green-800 hover:bg-green-900 text-white focus:ring-green-800";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={title}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              confirmVariant === "danger"
                ? "bg-red-100 text-red-600"
                : confirmVariant === "warning"
                ? "bg-amber-100 text-amber-600"
                : "bg-green-100 text-green-800"
            }`}
          >
            {confirmVariant === "danger" ? (
              <TrashIcon className="h-5 w-5" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Item Details Card */}
        {itemDetails && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/75 p-3 text-xs space-y-1.5">
            {Array.isArray(itemDetails) ? (
              itemDetails.map((detail, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-500 uppercase">
                    {detail.label}:
                  </span>
                  <span className="font-medium text-gray-900 text-right">
                    {detail.value}
                  </span>
                </div>
              ))
            ) : typeof itemDetails === "object" ? (
              Object.entries(itemDetails).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="font-semibold text-gray-500 uppercase">
                    {key}:
                  </span>
                  <span className="font-medium text-gray-900 text-right">
                    {String(val ?? "")}
                  </span>
                </div>
              ))
            ) : (
              <div className="font-medium text-gray-900">{itemDetails}</div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 transition ${getButtonStyles()}`}
          >
            {loading && <LoadingSpinner size="sm" />}
            <span>{loading ? "Processing..." : confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
