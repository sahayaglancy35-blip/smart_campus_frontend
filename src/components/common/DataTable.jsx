import { useState, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

function extractSearchableStrings(val, depth = 0) {
  if (depth > 3 || val === null || val === undefined) return [];
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return [String(val).toLowerCase()];
  }
  if (Array.isArray(val)) {
    return val.flatMap((v) => extractSearchableStrings(v, depth + 1));
  }
  if (typeof val === "object") {
    return Object.values(val).flatMap((v) => extractSearchableStrings(v, depth + 1));
  }
  return [];
}

export function DataTable({
  columns,
  data = [],
  searchKey = "",
  searchPlaceholder = "Search records...",
  pageSize = 10,
  emptyMessage = "No records found.",
  emptyAction = null,
  actions = null,
  rowKey = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const terms = searchTerm.toLowerCase().trim().split(/\s+/);

    return data.filter((item) => {
      if (!item) return false;
      if (searchKey && item[searchKey]) {
        const valStr = String(item[searchKey]).toLowerCase();
        return terms.every((t) => valStr.includes(t));
      }

      const allStrings = extractSearchableStrings(item);
      if (Array.isArray(columns)) {
        for (const col of columns) {
          if (col.key && item[col.key] !== undefined) {
            allStrings.push(...extractSearchableStrings(item[col.key]));
          }
        }
      }

      const combinedText = allStrings.join(" ");
      return terms.every((t) => combinedText.includes(t));
    });
  }, [data, searchTerm, searchKey, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safeCurrentPage, pageSize]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const resolveRowKey = (row, rowIdx) => {
    if (typeof rowKey === "function") return rowKey(row, rowIdx);
    if (typeof rowKey === "string" && row[rowKey] !== undefined) return row[rowKey];
    return (
      row.slot_id ??
      row.session_id ??
      row.attendance_id ??
      row.enrollment_id ??
      row.section_id ??
      row.offering_id ??
      row.subject_id ??
      row.batch_id ??
      row.programme_id ??
      row.school_id ??
      row.department_id ??
      row.classroom_id ??
      row.block_id ??
      row.degree_id ??
      row.student_id ??
      row.faculty_id ??
      row.user_id ??
      row.id ??
      row._id ??
      `row-${rowIdx}`
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-9 text-sm text-gray-900 placeholder-gray-400 shadow-xs focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              title="Clear search"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold uppercase text-gray-500">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-5 py-3.5 ${col.align === "right" ? "text-right" : ""} ${
                    col.headerClassName || col.className || ""
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-sm text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p>{emptyMessage}</p>
                    {emptyAction && <div className="mt-1">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={resolveRowKey(row, rowIdx)}
                  className="transition hover:bg-gray-50/60"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-5 py-3.5 ${
                        col.wrap ? "whitespace-normal" : "whitespace-nowrap"
                      } ${col.align === "right" ? "text-right" : ""} ${col.className || ""}`}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredData.length > pageSize && (
        <div className="flex items-center justify-between px-2 text-sm text-gray-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {(safeCurrentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-700">
              {Math.min(safeCurrentPage * pageSize, filteredData.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {filteredData.length}
            </span>{" "}
            results
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, Math.min(p, totalPages) - 1))}
              aria-label="Previous page"
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" /> Previous
            </button>
            <span className="text-xs">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, Math.max(1, p) + 1))}
              aria-label="Next page"
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-40"
            >
              Next <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
