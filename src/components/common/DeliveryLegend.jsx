import { DELIVERY_STYLE } from "./deliveryStyle";

export function DeliveryLegend({ className = "" }) {
  return (
    <div className={`flex items-center gap-4 text-xs font-medium text-gray-600 ${className}`}>
      {Object.values(DELIVERY_STYLE).map((style) => (
        <span key={style.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      ))}
    </div>
  );
}
