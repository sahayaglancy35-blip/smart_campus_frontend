import { useEffect } from "react";
import {
  XMarkIcon,
  UserIcon,
  IdentificationIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  Squares2X2Icon,
  BuildingLibraryIcon,
  UsersIcon,
  HeartIcon,
  BriefcaseIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

/* Returns the first non-empty value found under any of the given keys.
   Your API may name fields differently (register_no / registerNo ...),
   so list every spelling you might receive. */
function pick(user, keys) {
  for (const key of keys) {
    const value = user?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function capitalize(text) {
  return text ? String(text).charAt(0).toUpperCase() + String(text).slice(1).toLowerCase() : null;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/* Batch = first year in college to last year, e.g. "2023 – 2027" */
function formatBatch(user) {
  const direct = pick(user, ["batch", "batch_name", "batchName"]);
  if (direct) return direct;
  const start = pick(user, ["batch_start_year", "batchStartYear", "start_year", "admission_year"]);
  const end = pick(user, ["batch_end_year", "batchEndYear", "end_year", "graduation_year"]);
  if (start && end) return `${start} – ${end}`;
  return start ? String(start) : null;
}

/* Gender: prefer the raw API value (genderLabel) so a missing value
   shows "N/A" instead of a default. */
function genderOf(user) {
  const value = user && "genderLabel" in user ? user.genderLabel : pick(user, ["gender", "sex"]);
  return capitalize(value);
}

/* ----------------------------------------------------------------
   Which details to show for each role (in display order)
---------------------------------------------------------------- */
function buildDetails(user) {
  const role = user?.role || "STUDENT";
  const name = pick(user, ["name", "full_name", "fullName"]);
  const email = pick(user, ["email", "email_id", "emailId"]);
  const dob = formatDate(pick(user, ["dateOfBirth", "date_of_birth", "dob"]));
  const bloodGroup = pick(user, ["bloodGroup", "blood_group"]);
  const joiningYear = pick(user, ["joiningYear", "joining_year", "joined_year", "year_of_joining"]);

  if (role === "FACULTY") {
    return [
      { label: "Name", value: name, icon: UserIcon },
      { label: "Faculty ID", value: pick(user, ["facultyCode", "faculty_code", "employee_code", "registerNo"]), icon: IdentificationIcon },
      { label: "Class In-Charge", value: pick(user, ["inChargeClass", "in_charge_class", "class_in_charge"]), icon: UserGroupIcon },
      { label: "Joining Year", value: joiningYear, icon: CalendarDaysIcon },
      { label: "Role", value: pick(user, ["designation", "role_title", "position"]), icon: BriefcaseIcon },
      { label: "Date of Birth", value: dob, icon: CalendarDaysIcon },
      { label: "Department", value: pick(user, ["department", "department_name", "dept"]), icon: BuildingLibraryIcon },
      { label: "Gender", value: genderOf(user), icon: UsersIcon },
      { label: "Email", value: email, icon: EnvelopeIcon },
      { label: "Blood Group", value: bloodGroup, icon: HeartIcon },
    ];
  }

  if (role === "ADMIN") {
    return [
      { label: "Name", value: name, icon: UserIcon },
      { label: "Employee ID", value: pick(user, ["employeeId", "employee_id", "employee_code", "registerNo"]), icon: IdentificationIcon },
      { label: "Joining Year", value: joiningYear, icon: CalendarDaysIcon },
      { label: "Date of Birth", value: dob, icon: CalendarDaysIcon },
      { label: "Gender", value: genderOf(user), icon: UsersIcon },
      { label: "Email", value: email, icon: EnvelopeIcon },
      { label: "Blood Group", value: bloodGroup, icon: HeartIcon },
    ];
  }

  // STUDENT
  return [
    { label: "Name", value: name, icon: UserIcon },
    { label: "Register No", value: pick(user, ["registerNo", "register_no", "reg_no"]), icon: IdentificationIcon },
    { label: "Batch", value: formatBatch(user), icon: CalendarDaysIcon },
    { label: "Programme", value: pick(user, ["programme", "program", "programme_name", "program_name"]), icon: AcademicCapIcon },
    { label: "Section", value: pick(user, ["section", "section_code", "section_name"]), icon: Squares2X2Icon },
    { label: "Date of Birth", value: dob, icon: CalendarDaysIcon },
    { label: "Gender", value: genderOf(user), icon: UsersIcon },
    { label: "Email", value: email, icon: EnvelopeIcon },
    { label: "Blood Group", value: bloodGroup, icon: HeartIcon },
  ];
}

/* ================================================================
   PROFILE MODAL
   Opens from the avatar in the header on every page.
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

  const details = buildDetails(user);
  const name = pick(user, ["name", "full_name", "fullName"]);
  const roleLabel =
    user?.roleLabel ||
    { STUDENT: "Student", FACULTY: "Faculty", ADMIN: "Administrator" }[user?.role] ||
    "User";

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
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-green-200"
      >
        {/* Header band */}
        <div className="relative flex shrink-0 flex-col items-center bg-gradient-to-br from-green-950 via-green-900 to-green-800 px-6 pb-6 pt-8 text-center text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-green-100 transition hover:bg-white/10 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-800 shadow-lg ring-4 ring-white/80">
            {(name || "U").charAt(0).toUpperCase()}
          </span>
          <h3 className="mt-3 text-lg font-semibold">{name || "User"}</h3>
          <p className="text-sm text-green-200">{roleLabel}</p>
        </div>

        {/* Details: two columns on wider screens, scrolls if tall */}
        <dl className="grid grid-cols-1 gap-x-6 overflow-y-auto px-6 py-3 sm:grid-cols-2">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 border-b border-gray-100 py-3">
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