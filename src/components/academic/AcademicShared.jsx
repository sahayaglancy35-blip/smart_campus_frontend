import { useEffect, useState } from "react";
import { fetchSubjects } from "../../api/academic";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const codeOf = (s) => s.code || s.subject_code || "";

/** Header shown on top of a single opened course (same for student and faculty). */
export function CourseHeader({ subject, onBack }) {
  const meta = [subject.department, subject.credits != null && `${subject.credits} credits`, subject.faculty_name]
    .filter(Boolean)
    .join(" | ");
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
          <AcademicCapIcon className="h-7 w-7" />
        </span>
        <div>
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
            {codeOf(subject)}
          </span>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{subject.name}</h2>
          {meta && <p className="text-xs text-slate-500">{meta}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
      >
        <ArrowLeftIcon className="h-4 w-4" /> All courses
      </button>
    </div>
  );
}

/**
 * Step 1: a grid of courses. Step 2: after a click, ONLY that course is shown.
 * children(subject, headerElement) renders the opened course; place {headerElement} where you want the header.
 * The server decides which courses appear (student = enrolled, faculty = own, HOD = department).
 */
export function CoursePicker({ token, heading, subheading, emptyText, initialSubjectId = null, children }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(initialSubjectId);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchSubjects(token)
      .then((r) => live && setSubjects(Array.isArray(r?.data) ? r.data : []))
      .catch((e) => live && setError(e.message || "Failed to load courses"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [token]);

  const open = (id) => {
    setSelectedId(id);
    window.scrollTo?.({ top: 0 });
  };
  const back = () => {
    setSelectedId(null);
    window.scrollTo?.({ top: 0 });
  };

  if (loading) return <LoadingSpinner message="Loading your courses..." />;

  const selected = subjects.find((s) => String(s.subject_id) === String(selectedId));
  if (selected) return children(selected, <CourseHeader subject={selected} onBack={back} />);

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}
      <div>
        <h2 className="text-lg font-bold text-slate-900">{heading}</h2>
        {subheading && <p className="text-xs text-slate-500">{subheading}</p>}
      </div>

      {subjects.length === 0 && !error ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((sub) => (
            <button
              key={sub.subject_id}
              type="button"
              onClick={() => open(sub.subject_id)}
              className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <AcademicCapIcon className="h-6 w-6" />
                </span>
                {sub.delivery_type && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {sub.delivery_type}
                  </span>
                )}
              </div>
              <span className="mt-4 block w-fit rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                {codeOf(sub)}
              </span>
              <h3 className="mt-2 text-base font-bold leading-snug text-slate-900">{sub.name}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {[sub.department, sub.credits != null && `${sub.credits} credits`, sub.faculty_name]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                Open course <ChevronRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Topic list used by both student and faculty (faculty adds edit/delete/add). */
export function TopicList({ topics, selectedId, onSelect, onEdit, onDelete, action }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Course Topics &amp; Units ({topics.length})
        </h3>
        {action}
      </div>
      {topics.length === 0 && <p className="px-1 text-xs text-slate-400">No topics yet.</p>}
      <div className="space-y-1.5">
        {topics.map((t) => {
          const sel = selectedId === t.topic_id;
          return (
            <div key={t.topic_id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(t)}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl border p-3.5 text-left transition ${
                  sel
                    ? "border-emerald-600 bg-white font-bold text-emerald-950 shadow-sm ring-1 ring-emerald-600/30"
                    : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white"
                }`}
              >
                <div className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-emerald-800">
                    Unit {t.position}
                  </span>
                  <span className="mt-0.5 block truncate text-xs leading-snug">{t.title}</span>
                </div>
                <ChevronRightIcon className={`h-4 w-4 shrink-0 ${sel ? "text-emerald-700" : "text-slate-400"}`} />
              </button>
              {(onEdit || onDelete) && (
                <div className="absolute right-9 top-2.5 hidden items-center gap-1 group-hover:flex">
                  {onEdit && (
                    <button type="button" onClick={() => onEdit(t)} className="rounded p-1 text-slate-500 hover:bg-slate-200" title="Edit topic">
                      <PencilSquareIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" onClick={() => onDelete(t)} className="rounded p-1 text-red-500 hover:bg-red-50" title="Delete topic">
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Topic title card used by both student and faculty. aside = right-side content, footer = below (progress bar / tabs). */
export function TopicHeader({ topic, aside, footer }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
            Unit {topic.position}
          </span>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{topic.title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">{topic.description}</p>
        </div>
        {aside}
      </div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
