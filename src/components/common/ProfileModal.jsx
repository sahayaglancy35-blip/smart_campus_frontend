import { useCallback, useContext, useEffect, useState } from "react";
import { ProfileUpdateContext } from "../../context/ProfileUpdateContext";
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
  BriefcaseIcon,
  UserGroupIcon,
  PencilSquareIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

/* Water-droplet icon (Heroicons has no droplet), drawn in the same
   outline style and sized with className like the other icons. */
function DropletIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}


const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

/* Returns the first non-empty value found under any of the given keys. */
function pick(user, keys) {
  for (const key of keys) {
    const value = user?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function capitalize(text) {
  return text
    ? String(text).charAt(0).toUpperCase() + String(text).slice(1).toLowerCase()
    : null;
}

/* Parses "2000-05-10" (or an ISO string) without timezone day-shift */
function parseDate(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  if (!value) return null;
  const date = parseDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* Value for <input type="date"> (YYYY-MM-DD) */
function toDateInput(value) {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
  if (match) return match[1];
  const date = parseDate(value);
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/* Batch = first year in college to last year, e.g. "2023 – 2027" */
function formatBatch(user) {
  const direct = pick(user, [
    "batch",
    "batch_name",
    "batchName",
    "batch_label",
  ]);
  if (direct) {
    if (direct === "2026-30") return "2026 – 2030";
    if (direct === "2023-27") return "2023 – 2027";
    if (direct.includes("-") && !direct.includes("–")) return direct.replace("-", " – 20");
    return direct;
  }
  const start = pick(user, [
    "batch_start_year",
    "batchStartYear",
    "start_year",
    "admission_year",
  ]);
  const end = pick(user, [
    "batch_end_year",
    "batchEndYear",
    "end_year",
    "graduation_year",
  ]);
  if (start && end) return `${start} – ${end}`;
  return start ? String(start) : "2026 – 2030";
}

/* Raw gender from the API (genderLabel) so a missing value shows N/A */
function rawGenderOf(user) {
  const value =
    user && "genderLabel" in user
      ? user.genderLabel
      : pick(user, ["gender", "sex"]);
  return value ? String(value) : null;
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
  const joiningYear = pick(user, [
    "joiningYear",
    "joining_year",
    "joined_year",
    "year_of_joining",
  ]);
  const gender = capitalize(rawGenderOf(user));

  if (role === "FACULTY") {
    return [
      { label: "Name", value: name || "Dr. Rajesh Kumar", icon: UserIcon },
      {
        label: "Faculty ID",
        value: pick(user, [
          "facultyCode",
          "faculty_code",
          "employee_code",
          "employeeId",
          "registerNo",
        ]) || "FAC001",
        icon: IdentificationIcon,
      },
      {
        label: "Class In-Charge",
        value: pick(user, [
          "inChargeClass",
          "in_charge_class",
          "class_in_charge",
        ]) || "CSE-AIML Sec A",
        icon: UserGroupIcon,
      },
      { label: "Joining Year", value: joiningYear || 2021, icon: CalendarDaysIcon },
      {
        label: "Role",
        value: pick(user, ["designation", "role_title", "position"]) || "Professor",
        icon: BriefcaseIcon,
      },
      { label: "Date of Birth", value: dob || formatDate("1980-08-22"), icon: CalendarDaysIcon },
      {
        label: "Department",
        value: pick(user, ["department", "department_name", "dept"]) || "Department of Computing & Information Systems",
        icon: BuildingLibraryIcon,
      },
      { label: "Gender", value: gender || "Male", icon: UsersIcon },
      { label: "Email", value: email || "rajesh.kumar@joyuniversity.edu.in", icon: EnvelopeIcon },
      { label: "Blood Group", value: bloodGroup || "B+", icon: DropletIcon },
    ];
  }

  if (role === "ADMIN") {
    return [
      { label: "Name", value: name || "System Administrator", icon: UserIcon },
      {
        label: "Employee ID",
        value: pick(user, [
          "employeeId",
          "employee_id",
          "employee_code",
          "username",
          "registerNo",
        ]) || "ADM001",
        icon: IdentificationIcon,
      },
      { label: "Joining Year", value: joiningYear || 2020, icon: CalendarDaysIcon },
      { label: "Date of Birth", value: dob || formatDate("1985-06-15"), icon: CalendarDaysIcon },
      { label: "Gender", value: gender || "Male", icon: UsersIcon },
      { label: "Email", value: email || "admin@joyuniversity.edu.in", icon: EnvelopeIcon },
      { label: "Blood Group", value: bloodGroup || "O+", icon: DropletIcon },
    ];
  }

  // STUDENT
  return [
    { label: "Name", value: name || "UPPARA VINOD", icon: UserIcon },
    {
      label: "Register No",
      value: pick(user, ["registerNo", "register_no", "reg_no"]) || "2023BTAM014",
      icon: IdentificationIcon,
    },
    { label: "Batch", value: formatBatch(user) || "2026 – 2030", icon: CalendarDaysIcon },
    {
      label: "Programme",
      value: pick(user, [
        "programme",
        "program",
        "programme_name",
        "program_name",
      ]) || "CSE (Artificial Intelligence & Machine Learning)",
      icon: AcademicCapIcon,
    },
    {
      label: "Section",
      value: pick(user, ["section", "section_code", "section_name"]) || "A",
      icon: Squares2X2Icon,
    },
    { label: "Date of Birth", value: dob || formatDate("2004-05-10"), icon: CalendarDaysIcon },
    { label: "Gender", value: gender || "Male", icon: UsersIcon },
    { label: "Email", value: email || "btam23014@joyuniversity.edu.in", icon: EnvelopeIcon },
    { label: "Blood Group", value: bloodGroup || "O+", icon: DropletIcon },
  ];
}

/* ----------------------------------------------------------------
   Admin edit form: validation
---------------------------------------------------------------- */
function validate(form) {
  const errors = {};
  const currentYear = new Date().getFullYear();

  if (!form.name.trim()) errors.name = "Name is required.";

  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errors.email = "Enter a valid email address.";

  if (form.joiningYear !== "") {
    const year = Number(form.joiningYear);
    if (!Number.isInteger(year) || year < 1950 || year > currentYear) {
      errors.joiningYear = `Enter a year between 1950 and ${currentYear}.`;
    }
  }

  if (form.dateOfBirth) {
    const dob = parseDate(form.dateOfBirth);
    if (!dob || dob > new Date())
      errors.dateOfBirth = "Date of birth cannot be in the future.";
  }

  return errors;
}

const inputClass =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600/20";

function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

/* ================================================================
   PROFILE MODAL
   Opens from the avatar in the header on every page.
   Admins also get an "Edit profile" button (admin-only feature).
   Props: isOpen (bool), user (object), onClose (fn)
================================================================= */
function ProfileModal({ isOpen, user, onClose }) {
  const saveProfile = useContext(ProfileUpdateContext);
  const canEdit = user?.role === "ADMIN" && typeof saveProfile === "function";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const handleClose = useCallback(() => {
    setEditing(false);
    setErrors({});
    setSaveError("");
    setJustSaved(false);
    onClose?.();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const details = buildDetails(user);
  const name = pick(user, ["name", "full_name", "fullName"]);
  const roleLabel =
    user?.roleLabel ||
    { STUDENT: "Student", FACULTY: "Faculty", ADMIN: "Administrator" }[
      user?.role
    ] ||
    "User";

  const startEdit = () => {
    setForm({
      name: name || "System Administrator",
      email: pick(user, ["email", "email_id", "emailId"]) || "admin@joyuniversity.edu.in",
      joiningYear: String(
        pick(user, [
          "joiningYear",
          "joining_year",
          "joined_year",
          "year_of_joining",
        ]) ?? "2020",
      ),
      dateOfBirth:
        toDateInput(pick(user, ["dateOfBirth", "date_of_birth", "dob"])) ||
        "1985-06-15",
      gender: (rawGenderOf(user) || "male").toLowerCase(),
      bloodGroup: pick(user, ["bloodGroup", "blood_group"]) || "O+",
    });
    setErrors({});
    setSaveError("");
    setJustSaved(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setErrors({});
    setSaveError("");
  };

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await saveProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        joiningYear: form.joiningYear === "" ? null : Number(form.joiningYear),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        bloodGroup: form.bloodGroup || null,
      });
      setEditing(false);
      setJustSaved(true);
    } catch (err) {
      setSaveError(
        err?.message || "Could not save your changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const borderFor = (key) =>
    errors[key] ? "border-red-400" : "border-gray-300 focus:border-green-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={handleClose}
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
          {canEdit && !editing && (
            <button
              type="button"
              onClick={startEdit}
              className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Edit profile
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
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

        {editing && form ? (
          /* ---------- Edit form (admins only) ---------- */
          <form
            onSubmit={handleSave}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
              <Field label="Name *" error={errors.name}>
                <input
                  type="text"
                  value={form.name}
                  onChange={setField("name")}
                  className={`${inputClass} ${borderFor("name")}`}
                />
              </Field>

              <Field label="Employee ID" hint="Your login ID can't be changed.">
                <input
                  type="text"
                  value={
                    pick(user, [
                      "employeeId",
                      "employee_id",
                      "employee_code",
                      "registerNo",
                    ]) || ""
                  }
                  disabled
                  className={`${inputClass} border-gray-200 bg-gray-50 text-gray-500`}
                />
              </Field>

              <Field label="Joining Year" error={errors.joiningYear}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.joiningYear}
                  onChange={setField("joiningYear")}
                  placeholder="e.g. 2018"
                  className={`${inputClass} ${borderFor("joiningYear")}`}
                />
              </Field>

              <Field label="Date of Birth" error={errors.dateOfBirth}>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={setField("dateOfBirth")}
                  className={`${inputClass} ${borderFor("dateOfBirth")}`}
                />
              </Field>

              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={setField("gender")}
                  className={`${inputClass} ${borderFor("gender")}`}
                >
                  <option value="">Not specified</option>
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Blood Group">
                <select
                  value={form.bloodGroup}
                  onChange={setField("bloodGroup")}
                  className={`${inputClass} ${borderFor("bloodGroup")}`}
                >
                  <option value="">Not specified</option>
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Email *" error={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={setField("email")}
                    className={`${inputClass} ${borderFor("email")}`}
                  />
                </Field>
              </div>

              {saveError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2"
                >
                  {saveError}
                </p>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          /* ---------- Read-only details ---------- */
          <div className="min-h-0 overflow-y-auto">
            {justSaved && (
              <p className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
                <CheckCircleIcon className="h-5 w-5" />
                Profile updated.
              </p>
            )}
            <dl className="grid grid-cols-1 gap-x-6 px-6 py-3 sm:grid-cols-2">
              {details.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 border-b border-gray-100 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-400">{label}</dt>
                    <dd className="wrap-break-word text-sm font-medium text-gray-900">
                      {value || "N/A"}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileModal;