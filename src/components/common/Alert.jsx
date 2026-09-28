import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export function Alert({ type = "error", message, onClose }) {
  if (!message) return null;

  const styles = {
    error: {
      bg: "bg-red-50 border-red-200 text-red-800",
      icon: ExclamationTriangleIcon,
      iconColor: "text-red-600",
    },
    success: {
      bg: "bg-green-50 border-green-200 text-green-800",
      icon: CheckCircleIcon,
      iconColor: "text-green-600",
    },
    info: {
      bg: "bg-blue-50 border-blue-200 text-blue-800",
      icon: InformationCircleIcon,
      iconColor: "text-blue-600",
    },
  };

  const current = styles[type] || styles.error;
  const Icon = current.icon;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-xs ${current.bg}`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${current.iconColor}`} />
      <div className="flex-1 text-sm font-medium leading-relaxed">{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-gray-400 hover:text-gray-700"
          aria-label="Dismiss alert"
        >
          &times;
        </button>
      )}
    </div>
  );
}

export default Alert;
