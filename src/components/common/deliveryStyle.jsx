/* ================================================================
   Theory / Lab colors, shared by every student page so a course
   looks the same everywhere (courses, timetable, attendance...).
   Change a color here and all pages update.
================================================================= */

export const DELIVERY_STYLE = {
  THEORY: {
    label: "Theory",
    card: "border-green-200 bg-green-50/60",
    code: "bg-green-100 text-green-800",
    chip: "bg-green-100 text-green-800",
    value: "text-green-800",
    dot: "bg-green-500",
    avatar: "bg-gradient-to-br from-green-600 to-emerald-500 text-white",
  },
  LAB: {
    label: "Lab",
    card: "border-yellow-200 bg-yellow-50/50",
    code: "bg-yellow-100 text-yellow-900",
    chip: "bg-yellow-100 text-yellow-900",
    value: "text-yellow-700",
    dot: "bg-yellow-400/70",
    avatar: "bg-gradient-to-br from-yellow-300/80 to-yellow-200/80 text-yellow-900",
  },
};

/* Fields an API row might use to say theory or lab */
const TYPE_FIELDS = ["delivery_type", "subject_type", "session_type", "class_type", "course_type"];

/* Works out "LAB" or "THEORY" for a course, timetable slot or subject row.
   1) uses the API field if the row has one,
   2) otherwise guesses LAB when the subject name contains
      "lab", "laboratory" or "practical",
   3) otherwise THEORY. */
export function getDeliveryType(item) {
  for (const field of TYPE_FIELDS) {
    const raw = item?.[field];
    if (!raw) continue;
    const key = String(raw).toUpperCase();
    if (key.includes("LAB") || key.includes("PRACTICAL")) return "LAB";
    if (key.includes("THEORY") || key.includes("LECTURE")) return "THEORY";
  }
  const name = String(item?.subject_name || "").toLowerCase();
  if (/\b(lab|laboratory|practical)\b/.test(name)) return "LAB";
  return "THEORY";
}

export function deliveryStyleOf(item) {
  return DELIVERY_STYLE[getDeliveryType(item)];
}

/* Small "● Theory  ● Lab" key shown above lists */
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