import { useEffect } from "react";
import {
  XMarkIcon,
  UserIcon,
  IdentificationIcon,
  EnvelopeIcon,
  PhoneIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

/* Returns the first non-empty value found under any of the given keys.
   Your API may name fields differently (registerNo / register_no / ...),
   so list every spelling you might receive. */
function pick(user, keys) {
  for (const key of keys) {
    const value = user?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : null;
}

/* ================================================================
   PROFILE MODAL
   Opens from the avatar ("S") in the header. Shows the student's
   name, register no, email, phone, class, department and gender.
   Props: isOpen (bool), user (object), onClose (fn)
================================================================= */
function ProfileModal({ isOpen, user, onClose }) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const name = pick(user, ["name", "full_name", "fullName", "student_name"]);

  const isStudent = !user?.role || user.role === "STUDENT";
  const isFaculty = user?.role === "FACULTY";

  const details = [
    { label: "Name", value: name, icon: UserIcon },
    {
      label: isStudent ? "Register No" : isFaculty ? "Employee ID" : "User ID",
      value: pick(user, ["registerNo", "register_no", "reg_no", "regNo", "userId", "user_id"]),
      icon: IdentificationIcon,
    },
    { label: "Email ID", value: pick(user, ["email", "email_id", "emailId"]), icon: EnvelopeIcon },
    {
      label: "Phone No",
      value: pick(user, ["phone", "phone_no", "phoneNo", "mobile", "mobile_no"]),
      icon: PhoneIcon,
    },
    ...(isStudent
      ? [
          {
            label: "Class",
            value: pick(user, ["studentClass", "class", "class_name", "className", "section", "section_code"]),
            icon: AcademicCapIcon,
          },
        ]
      : []),
    {
      label: "Department",
      value: pick(user, ["department", "department_name", "dept", "dept_name"]),
      icon: BuildingLibraryIcon,
    },
    ...(isStudent
      ? [{ label: "Gender", value: capitalize(pick(user, ["gender", "sex"])), icon: UsersIcon }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My profile"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-green-200"
      >
        {/* Header band */}
        <div className="relative flex flex-col items-center bg-gradient-to-br from-green-950 via-green-900 to-green-800 px-6 pb-6 pt-8 text-center text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-green-100 transition hover:bg-white/10 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-800 ring-4 ring-white/80 shadow-lg">
            {(name || "S").charAt(0).toUpperCase()}
          </span>
          <h3 className="mt-3 text-lg font-semibold">{name || "User"}</h3>
          <p className="text-sm text-green-200">{user?.roleLabel || "Student"}</p>
        </div>

        {/* Details */}
        <dl className="divide-y divide-gray-100 px-6 py-2">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="break-words text-sm font-medium text-gray-900">
                  {value || "N/A"}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default ProfileModal;