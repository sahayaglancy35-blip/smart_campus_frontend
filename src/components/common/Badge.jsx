export function Badge({ status }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  const variantStyles = {
    // Green / Success
    ACTIVE: "bg-green-100 text-green-800 border-green-200",
    PRESENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
    OPEN: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REGISTERED: "bg-blue-100 text-blue-800 border-blue-200",
    APPROVED: "bg-green-100 text-green-800 border-green-200",

    // Yellow / Warning
    LATE: "bg-amber-100 text-amber-800 border-amber-200",
    SCHEDULED: "bg-amber-100 text-amber-800 border-amber-200",
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    SEMESTER_WITHDRAWAL: "bg-amber-100 text-amber-800 border-amber-200",
    INTERNSHIP_BREAK: "bg-indigo-100 text-indigo-800 border-indigo-200",

    // Red / Danger
    ABSENT: "bg-rose-100 text-rose-800 border-rose-200",
    INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
    CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
    CLOSED: "bg-gray-100 text-gray-700 border-gray-200",
    TERMINATED: "bg-red-100 text-red-800 border-red-200",
    DISCIPLINARY_WITHDRAWAL: "bg-red-100 text-red-800 border-red-200",
    DROPPED: "bg-red-100 text-red-800 border-red-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",

    // Blue / Info
    GRADUATED: "bg-teal-100 text-teal-800 border-teal-200",
    THEORY: "bg-sky-100 text-sky-800 border-sky-200",
    LAB: "bg-purple-100 text-purple-800 border-purple-200",
    PROJECT: "bg-cyan-100 text-cyan-800 border-cyan-200",
  };

  const style =
    variantStyles[normalized] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      {status}
    </span>
  );
}

export default Badge;
