export function LoadingSpinner({ message = "Loading...", size = "md" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
      <div
        className={`animate-spin rounded-full border-green-700 border-t-transparent ${
          sizeClasses[size] || sizeClasses.md
        }`}
      />
      {message && <p className="mt-3 text-sm font-medium">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
