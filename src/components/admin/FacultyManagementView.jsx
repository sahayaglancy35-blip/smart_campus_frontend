import { useState, useEffect } from "react";
import {
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getDepartments,
} from "../../api/admin";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  PlusIcon,
  PencilSquareIcon,
  UserMinusIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const DESIGNATIONS = [
  { designation_id: 1, name: "Professor" },
  { designation_id: 2, name: "Associate Professor" },
  { designation_id: 3, name: "Assistant Professor" },
  { designation_id: 4, name: "Senior Professor" },
  { designation_id: 5, name: "Lecturer" },
  { designation_id: 6, name: "Teaching Assistant" },
  { designation_id: 7, name: "Lab Instructor" },
];

export function FacultyManagementView({ token }) {
  const [facultyList, setFacultyList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [viewingFaculty, setViewingFaculty] = useState(null);
  const [deactivatingFaculty, setDeactivatingFaculty] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    employee_code: "",
    full_name: "",
    email: "",
    department_id: 1,
    designation_id: 1,
    school_id: 1,
    is_active: 1,
  });

  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadData() {
      try {
        setError("");
        const [facRes, deptRes] = await Promise.all([
          getFaculty(token, controller.signal),
          getDepartments(token, controller.signal).catch(() => ({ data: [] })),
        ]);

        setFacultyList(Array.isArray(facRes?.data) ? facRes.data : []);
        setDepartments(Array.isArray(deptRes?.data) ? deptRes.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load faculty records.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, [token, reloadTrigger]);

  const getDesignationName = (row) => {
    if (!row) return "—";
    if (row.designation_name) return row.designation_name;
    const found = DESIGNATIONS.find((d) => d.designation_id === row.designation_id);
    return found ? found.name : "—";
  };

  const getDepartmentName = (row) => {
    if (!row) return "—";
    if (row.department_name) return row.department_name;
    const found = departments.find((d) => d.department_id === row.department_id);
    return found ? found.name : `Dept #${row.department_id || "—"}`;
  };

  const getSchoolName = (row) => {
    if (!row) return "—";
    if (row.school_name) return row.school_name;
    if (row.school_code) return row.school_code;
    return "—";
  };

  const handleOpenCreate = () => {
    const defaultDept = departments[0];
    setFormData({
      employee_code: "",
      full_name: "",
      email: "",
      department_id: defaultDept?.department_id || 1,
      designation_id: 1,
      school_id: defaultDept?.school_id || 1,
      is_active: 1,
    });
    setFormError("");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (faculty) => {
    setEditingFaculty(faculty);
    setFormData({
      employee_code: faculty.employee_code || "",
      full_name: faculty.full_name || "",
      email: faculty.email || "",
      department_id: faculty.department_id || departments[0]?.department_id || 1,
      designation_id: faculty.designation_id || 1,
      school_id: faculty.school_id || 1,
      is_active: faculty.is_active ? 1 : 0,
    });
    setFormError("");
  };

  const handleDepartmentChange = (deptId) => {
    const selectedId = Number(deptId);
    const selectedDept = departments.find((d) => d.department_id === selectedId);
    setFormData((prev) => ({
      ...prev,
      department_id: selectedId,
      school_id: selectedDept?.school_id || prev.school_id,
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.employee_code.trim() || !formData.full_name.trim()) {
        throw new Error("Employee code and full name are required.");
      }

      await createFaculty(token, {
        employee_code: formData.employee_code.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || undefined,
        department_id: Number(formData.department_id) || undefined,
        designation_id: Number(formData.designation_id) || undefined,
        school_id: Number(formData.school_id) || undefined,
        is_active: Number(formData.is_active),
      });

      setIsCreateOpen(false);
      setActionSuccess("Faculty member created successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to create faculty member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.employee_code.trim() || !formData.full_name.trim()) {
        throw new Error("Employee code and full name are required.");
      }

      await updateFaculty(token, editingFaculty.faculty_id, {
        employee_code: formData.employee_code.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || undefined,
        department_id: Number(formData.department_id) || undefined,
        designation_id: Number(formData.designation_id) || undefined,
        school_id: Number(formData.school_id) || undefined,
        is_active: Number(formData.is_active),
      });

      setEditingFaculty(null);
      setActionSuccess("Faculty details updated successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to update faculty member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivatingFaculty) return;
    setSubmitting(true);

    try {
      await deleteFaculty(token, deactivatingFaculty.faculty_id);
      setDeactivatingFaculty(null);
      setActionSuccess("Faculty member deactivated successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Failed to deactivate faculty profile.");
      setDeactivatingFaculty(null);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Code",
      key: "employee_code",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-green-900 bg-green-50 px-2 py-1 rounded">
          {row.employee_code || "—"}
        </span>
      ),
    },
    {
      header: "Faculty Member",
      key: "full_name",
      render: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.full_name}</p>
          <p className="text-xs text-gray-400">{row.email || "No email"}</p>
        </div>
      ),
    },
    {
      header: "Designation",
      key: "designation_id",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-700">
          {getDesignationName(row)}
        </span>
      ),
    },
    {
      header: "Department",
      key: "department_id",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-700">
          {getDepartmentName(row)}
        </span>
      ),
    },
    {
      header: "Status",
      key: "is_active",
      render: (row) => (
        <Badge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setViewingFaculty(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-700 transition"
            title="View Profile Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-700 transition"
            title="Edit Faculty Member"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {row.is_active ? (
            <button
              type="button"
              onClick={() => setDeactivatingFaculty(row)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-700 transition"
              title="Deactivate Faculty"
            >
              <UserMinusIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {loading ? (
        <LoadingSpinner message="Fetching faculty and staff directory..." />
      ) : (
        <DataTable
          columns={columns}
          data={facultyList}
          searchPlaceholder="Search faculty by name, employee code, department..."
          pageSize={10}
          emptyMessage="No faculty records found."
          actions={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" />
              Add Faculty Profile
            </button>
          }
        />
      )}

      {/* View Profile Details Modal */}
      <Modal
        isOpen={Boolean(viewingFaculty)}
        onClose={() => setViewingFaculty(null)}
        title="Faculty Member Profile"
        maxWidth="max-w-lg"
      >
        {viewingFaculty && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-800">
                <AcademicCapIcon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">
                  {viewingFaculty.full_name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-semibold text-green-800 bg-green-50 px-2 py-0.5 rounded">
                    {viewingFaculty.employee_code || "—"}
                  </span>
                  <Badge status={viewingFaculty.is_active ? "ACTIVE" : "INACTIVE"} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Designation</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {getDesignationName(viewingFaculty)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Academic Department</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {getDepartmentName(viewingFaculty)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">School Affiliation</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {getSchoolName(viewingFaculty)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Institutional Email</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {viewingFaculty.email || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">System Faculty ID</span>
                <p className="mt-1 font-mono font-semibold text-gray-800">
                  #{viewingFaculty.faculty_id}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Created On</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {viewingFaculty.created_at
                    ? new Date(viewingFaculty.created_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setViewingFaculty(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingFaculty;
                  setViewingFaculty(null);
                  handleOpenEdit(target);
                }}
                className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Faculty Member"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Employee Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.employee_code}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
              placeholder="e.g. FAC-CS-004"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Dr. Priya Raman"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Institutional Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="priya.raman@joy.edu"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Department
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.name} ({dept.code || `#${dept.department_id}`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Designation
              </label>
              <select
                value={formData.designation_id}
                onChange={(e) =>
                  setFormData({ ...formData, designation_id: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {DESIGNATIONS.map((desg) => (
                  <option key={desg.designation_id} value={desg.designation_id}>
                    {desg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Status
            </label>
            <select
              value={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Faculty"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingFaculty)}
        onClose={() => setEditingFaculty(null)}
        title="Edit Faculty Details"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Employee Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.employee_code}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Department
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.name} ({dept.code || `#${dept.department_id}`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Designation
              </label>
              <select
                value={formData.designation_id}
                onChange={(e) =>
                  setFormData({ ...formData, designation_id: Number(e.target.value) })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {DESIGNATIONS.map((desg) => (
                  <option key={desg.designation_id} value={desg.designation_id}>
                    {desg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Active Status
            </label>
            <select
              value={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setEditingFaculty(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={Boolean(deactivatingFaculty)}
        onClose={() => setDeactivatingFaculty(null)}
        title="Confirm Faculty Deactivation"
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-base font-bold text-gray-900">
            Deactivate {deactivatingFaculty?.full_name}?
          </h4>
          <p className="mt-2 text-xs text-gray-500">
            This will mark employee {deactivatingFaculty?.employee_code} as inactive in the system. Existing relationships (e.g. course offerings) will be preserved.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setDeactivatingFaculty(null)}
              className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeactivateConfirm}
              className="w-1/2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {submitting ? "Deactivating..." : "Deactivate"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default FacultyManagementView;
