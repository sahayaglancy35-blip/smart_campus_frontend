import { useState, useEffect, useMemo } from "react";
import { fetchStudentAttendance } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import DataTable from "../common/DataTable";
import Badge from "../common/Badge";
import { deliveryStyleOf, DeliveryLegend } from "../common/deliveryStyle";

export function AttendanceHistoryView({ token, initialFilter = "ALL" }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(token ? "" : "Please log in to view attendance logs.");
  const [statusFilter, setStatusFilter] = useState(initialFilter);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadAttendanceLogs() {
      try {
        setLoading(true);
        setError("");
        const result = await fetchStudentAttendance(token, controller.signal);
        setRecords(Array.isArray(result?.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load attendance records.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAttendanceLogs();
    return () => controller.abort();
  }, [token]);

  const filteredRecords = useMemo(() => {
    if (statusFilter === "ALL") return records;
    return records.filter((r) => r.status === statusFilter);
  }, [records, statusFilter]);

  if (loading) {
    return <LoadingSpinner message="Loading attendance session records..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  const columns = [
    {
      header: "Session Date",
      key: "session_date",
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {row.session_date ? new Date(row.session_date).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      header: "Subject Code",
      key: "subject_code",
      render: (row) => {
        const style = deliveryStyleOf(row);
        return (
          <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${style.code}`}>
            {row.subject_code}
          </span>
        );
      },
    },
    {
      header: "Subject Name",
      key: "subject_name",
      render: (row) => {
        const style = deliveryStyleOf(row);
        return (
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">{row.subject_name}</span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.chip}`}>
              {style.label}
            </span>
          </span>
        );
      },
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: "Source",
      key: "source",
      render: (row) => (
        <span className="text-xs text-gray-500 font-mono">
          {row.source || "SYSTEM"}
        </span>
      ),
    },
    {
      header: "Logged At",
      key: "marked_at",
      render: (row) => (
        <span className="text-xs text-gray-500">
          {row.marked_at ? new Date(row.marked_at).toLocaleTimeString() : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Tabs + Theory/Lab legend */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            statusFilter === "ALL"
              ? "bg-green-800 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          All Records ({records.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("PRESENT")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            statusFilter === "PRESENT"
              ? "bg-emerald-700 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Present ({records.filter((r) => r.status === "PRESENT").length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("LATE")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            statusFilter === "LATE"
              ? "bg-amber-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Late ({records.filter((r) => r.status === "LATE").length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("ABSENT")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
            statusFilter === "ABSENT"
              ? "bg-red-700 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Absent Only ({records.filter((r) => r.status === "ABSENT").length})
        </button>

        <DeliveryLegend className="ml-auto" />
      </div>

      <DataTable
        columns={columns}
        data={filteredRecords}
        searchPlaceholder="Search by subject code or title..."
        pageSize={12}
        emptyMessage="No attendance sessions matching the current filter."
      />
    </div>
  );
}

export default AttendanceHistoryView;