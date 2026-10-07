export function StatCard({ label, value, description, color = "green", icon: Icon }) {
  const colorStyles = {
    green: "border-green-100 bg-white text-green-900",
    emerald: "border-emerald-100 bg-white text-emerald-900",
    blue: "border-blue-100 bg-white text-blue-900",
    red: "border-red-100 bg-white text-red-900",
    gray: "border-gray-200 bg-white text-gray-900",
  };

  const numberColors = {
    green: "text-green-800",
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    red: "text-red-700",
    gray: "text-gray-800",
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
        colorStyles[color] || colorStyles.green
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${numberColors[color] || numberColors.green}`}>
        {value ?? 0}
      </p>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default StatCard;
