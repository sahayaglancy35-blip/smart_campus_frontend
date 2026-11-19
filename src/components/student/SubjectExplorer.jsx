import { useState, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

/**
 * SubjectExplorer: Scalable, searchable, semester-grouped navigation panel
 * for enrolled student subjects.
 */
export function SubjectExplorer({
  subjects = [],
  selectedSubject = null,
  onSelectSubject,
  className = "",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSemesters, setCollapsedSemesters] = useState({});

  // Filter subjects based on search query (matches code and name)
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase().trim();
    return subjects.filter((s) => {
      const code = (s.subject_code || s.code || "").toLowerCase();
      const name = (s.name || "").toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [subjects, searchQuery]);

  // Group subjects by semester
  const semesterGroups = useMemo(() => {
    const groups = {};
    for (const sub of filteredSubjects) {
      const semNo = sub.semester || sub.semester_no;
      const semKey = semNo ? `Semester ${semNo}` : "General & Electives";
      if (!groups[semKey]) {
        groups[semKey] = {
          name: semKey,
          semNo: semNo ? Number(semNo) : 999,
          subjects: [],
        };
      }
      groups[semKey].subjects.push(sub);
    }

    // Sort numerically by semester number
    return Object.values(groups).sort((a, b) => a.semNo - b.semNo);
  }, [filteredSubjects]);

  // Derive collapsed state without synchronous setState inside effects
  const isSemesterCollapsed = (groupName) => {
    if (Object.prototype.hasOwnProperty.call(collapsedSemesters, groupName)) {
      return Boolean(collapsedSemesters[groupName]);
    }
    return false;
  };

  const toggleSemester = (semName) => {
    setCollapsedSemesters((prev) => ({
      ...prev,
      [semName]: !isSemesterCollapsed(semName),
    }));
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden ${className}`}
    >
      {/* Explorer Header */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <BookOpenIcon className="h-4 w-4 text-emerald-800" />
            <h2 className="text-xs font-bold text-slate-900 tracking-tight">
              Subject Explorer
            </h2>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            {subjects.length} {subjects.length === 1 ? "Course" : "Courses"}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code or title..."
            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-0.5">
            <span>
              Matches: <strong className="text-slate-800">{filteredSubjects.length}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-emerald-700 hover:underline font-medium"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Subjects Scrollable Body */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-270px)] min-h-[320px] p-2 space-y-3 divide-y divide-slate-100/80">
        {subjects.length === 0 ? (
          <div className="py-10 text-center px-3">
            <AcademicCapIcon className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-700">No enrolled subjects</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              You are not registered in any courses yet.
            </p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="py-8 text-center px-3">
            <MagnifyingGlassIcon className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-700">No matching courses</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No subjects match &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-900 underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          semesterGroups.map((group, groupIdx) => {
            const isCollapsed = isSemesterCollapsed(group.name);
            return (
              <div key={group.name} className={groupIdx > 0 ? "pt-2.5" : ""}>
                {/* Semester Group Heading with Collapse Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSemester(group.name)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between px-2 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition rounded-lg hover:bg-slate-50"
                >
                  <span className="flex items-center gap-1">
                    {group.name}
                    <span className="text-[10px] font-normal text-slate-400 lowercase">
                      ({group.subjects.length})
                    </span>
                  </span>
                  {isCollapsed ? (
                    <ChevronRightIcon className="h-3 w-3 text-slate-400" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3 text-slate-400" />
                  )}
                </button>

                {/* Group Subjects List */}
                {!isCollapsed && (
                  <div className="space-y-1">
                    {group.subjects.map((sub) => {
                      const isSelected =
                        selectedSubject &&
                        String(selectedSubject.subject_id) === String(sub.subject_id);

                      return (
                        <button
                          key={sub.subject_id}
                          type="button"
                          onClick={() => onSelectSubject(sub)}
                          className={`w-full text-left px-2.5 py-2 rounded-xl transition flex items-center justify-between gap-2 border text-xs group ${
                            isSelected
                              ? "bg-emerald-50/90 border-emerald-600 text-emerald-950 font-semibold shadow-2xs ring-1 ring-emerald-600/20"
                              : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono text-[11px] font-bold ${
                                  isSelected ? "text-emerald-900" : "text-slate-900"
                                }`}
                              >
                                {sub.subject_code || sub.code}
                              </span>
                              {sub.credits && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  • {sub.credits} cr
                                </span>
                              )}
                            </div>
                            <p
                              className={`truncate text-xs mt-0.5 ${
                                isSelected ? "text-emerald-900 font-medium" : "text-slate-600"
                              }`}
                              title={sub.name}
                            >
                              {sub.name}
                            </p>
                          </div>

                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SubjectExplorer;
