import { useState, useEffect } from "react";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
} from "../../api/admin";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const STUDENT_STATUSES = [
  "ACTIVE",
  "SEMESTER_WITHDRAWAL",
  "INTERNSHIP_BREAK",
  "DISCIPLINARY_WITHDRAWAL",
  "TERMINATED",
  "GRADUATED",
];

const BATCH_OPTIONS = [
  { id: 1, label: "Batch 2023-27 (Batch #1)" },
  { id: 2, label: "Batch 2024-28 (Batch #2)" },
  { id: 3, label: "Batch 2025-29 (Batch #3)" },
  { id: 4, label: "Batch 2026-30 (Batch #4)" },
];

export function StudentManagementView({ token }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    register_no: "",
    full_name: "",
    email: "",
    phone: "",
    batch_id: 1,
    status: "ACTIVE",
  });

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function fetchList() {
      try {
        setError("");
        const result = await getStudents(token, controller.signal);
        setStudents(Array.isArray(result?.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load students.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchList();
    return () => controller.abort();
  }, [token, reloadTrigger]);

  const handleOpenCreate = () => {
    setFormData({
      register_no: "",
      full_name: "",
      email: "",
      phone: "",
      batch_id: 1,
      status: "ACTIVE",
    });
    setFormError("");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      register_no: student.register_no || "",
      full_name: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      batch_id: student.batch_id || 1,
      status: student.status || "ACTIVE",
    });
    setFormError("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.register_no.trim() || !formData.full_name.trim()) {
        throw new Error("Register number and full name are required.");
      }

      await createStudent(token, {
        ...formData,
        batch_id: Number(formData.batch_id) || 1,
      });

      setIsCreateOpen(false);
      setActionSuccess("Student registered successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to create student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setFormError("");
    setSubmitting(true);

    try {
      await updateStudent(token, editingStudent.student_id, {
        ...formData,
        batch_id: Number(formData.batch_id) || 1,
      });

      setEditingStudent(null);
      setActionSuccess("Student profile updated successfully!");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setFormError(err.message || "Failed to update student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    setSubmitting(true);

    try {
      await deleteStudent(token, deletingStudent.student_id);
      setDeletingStudent(null);
      setActionSuccess("Student deleted successfully.");
      setTimeout(() => setActionSuccess(""), 4000);
      setReloadTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err.message || "Cannot delete student with associated enrollment records.");
      setDeletingStudent(null);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Reg No",
      key: "register_no",
      render: (row) => (
        <button
          type="button"
          onClick={() => setViewingStudent(row)}
          className="font-mono text-xs font-bold text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition text-left cursor-pointer"
          title="Click to view full details"
        >
          {row.register_no}
        </button>
      ),
    },
    {
      header: "Full Name",
      key: "full_name",
      render: (row) => (
        <div>
          <button
            type="button"
            onClick={() => setViewingStudent(row)}
            className="font-bold text-gray-900 hover:text-green-800 text-left transition cursor-pointer"
          >
            {row.full_name}
          </button>
          <p className="text-xs text-gray-400">{row.email || "No email"}</p>
        </div>
      ),
    },
    {
      header: "Contact",
      key: "phone",
      render: (row) => <span className="text-xs text-gray-600">{row.phone || "—"}</span>,
    },
    {
      header: "Batch",
      key: "batch_id",
      render: (row) => (
        <span className="text-xs font-semibold text-gray-700">
          {row.batch_label || `Batch #${row.batch_id}`}
        </span>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setViewingStudent(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-700 transition"
            title="Edit Student"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingStudent(row)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 transition"
            title="Delete Student"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {actionSuccess && <Alert type="success" message={actionSuccess} />}
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {loading ? (
        <LoadingSpinner message="Fetching student directory from MySQL database..." />
      ) : (
        <DataTable
          columns={columns}
          data={students}
          searchPlaceholder="Search student by name, register number..."
          pageSize={10}
          emptyMessage="No students found matching your search."
          actions={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-900 transition"
            >
              <PlusIcon className="h-4 w-4" />
              Register Student
            </button>
          }
        />
      )}

      {/* Create Student Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New Student"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Register Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.register_no}
              onChange={(e) => setFormData({ ...formData, register_no: e.target.value })}
              placeholder="e.g. 2024CS0101"
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
              placeholder="e.g. Aarav Kumar"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="aarav@joy.edu"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Batch Cohort <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {BATCH_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Academic Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {STUDENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
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
              {submitting ? "Registering..." : "Create Student"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        title="Edit Student Record"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700">
              Register Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.register_no}
              onChange={(e) => setFormData({ ...formData, register_no: e.target.value })}
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

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Batch Cohort <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {BATCH_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              >
                {STUDENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setEditingStudent(null)}
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

      {/* View Student Details Modal */}
      <Modal
        isOpen={Boolean(viewingStudent)}
        onClose={() => setViewingStudent(null)}
        title="Student Information Details"
        maxWidth="max-w-lg"
      >
        {viewingStudent && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-800">
                <AcademicCapIcon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">
                  {viewingStudent.full_name}
                </h4>
                <span className="font-mono text-xs font-semibold text-green-800 bg-green-50 px-2 py-0.5 rounded">
                  {viewingStudent.register_no}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Academic Status</span>
                <div className="mt-1">
                  <Badge status={viewingStudent.status} />
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Batch Affiliation</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {viewingStudent.batch_label || `Batch #${viewingStudent.batch_id}`}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Email Address</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {viewingStudent.email || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Contact Phone</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {viewingStudent.phone || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">System Student ID</span>
                <p className="mt-1 font-mono font-semibold text-gray-800">
                  #{viewingStudent.student_id}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <span className="text-gray-400 font-medium">Registration Date</span>
                <p className="mt-1 font-semibold text-gray-800">
                  {viewingStudent.created_at
                    ? new Date(viewingStudent.created_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const st = viewingStudent;
                  setViewingStudent(null);
                  handleOpenEdit(st);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit Student
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        title="Confirm Student Deletion"
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-base font-bold text-gray-900">
            Delete {deletingStudent?.full_name}?
          </h4>
          <p className="mt-2 text-xs text-gray-500">
            This will permanently remove student {deletingStudent?.register_no} from the database.
            Foreign key constraints will block deletion if enrollment records exist.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setDeletingStudent(null)}
              className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteConfirm}
              className="w-1/2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
            >
              {submitting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StudentManagementView;
