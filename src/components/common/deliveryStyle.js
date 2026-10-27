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
    card: "border-yellow-300 bg-yellow-50/80",
    code: "bg-yellow-200 text-yellow-400",
    chip: "bg-yellow-300 text-yellow-950",
    value: "text-yellow-700",
    dot: "bg-yellow-400",
    avatar: "bg-gradient-to-br from-yellow-400 to-yellow-300 text-yellow-950",
  },
};

const TYPE_FIELDS = [
  "delivery_type",
  "subject_type",
  "session_type",
  "class_type",
  "course_type",
];

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
