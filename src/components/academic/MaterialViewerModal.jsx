import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import { API_BASE_URL } from "../../api/client";
import { fetchSignedDownloadUrl } from "../../api/academic";
import {
  PlayIcon,
  PresentationChartBarIcon,
  LinkIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
  UserIcon,
  DocumentTextIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/20/solid";

export default function MaterialViewerModal({
  isOpen,
  onClose,
  material,
  onComplete,
  token,
}) {
  const [zoom, setZoom] = useState(100);
  const [activeSlide, setActiveSlide] = useState(1);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isMarking, setIsMarking] = useState(false);
  const [locallyCompleted, setLocallyCompleted] = useState(false);
  const [fileBlobUrl, setFileBlobUrl] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const isCompleted =
    locallyCompleted ||
    material?.user_progress?.status === "COMPLETED" ||
    (material?.user_progress?.percent || 0) >= 100;

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (material?.material_id && material.type === "PDF") {
      queueMicrotask(() => {
        if (active) setFileLoading(true);
      });
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      fetch(`${API_BASE_URL}/academic/materials/${material.material_id}/view`, { headers })
        .then((res) => {
          if (!res.ok) {
            return fetch(`${API_BASE_URL}/academic/materials/${material.material_id}/download?disposition=inline`, { headers });
          }
          return res;
        })
        .then((res) => {
          if (!res.ok) throw new Error("Preview stream failed");
          return res.blob();
        })
        .then((blob) => {
          if (active) {
            createdUrl = URL.createObjectURL(blob);
            setFileBlobUrl(createdUrl);
            setFileLoading(false);
          }
        })
        .catch((err) => {
          console.warn("Could not load document stream:", err.message);
          if (active) {
            setFileBlobUrl(null);
            setFileLoading(false);
          }
        });
    } else {
      queueMicrotask(() => {
        if (active) {
          setFileBlobUrl(null);
          setFileLoading(false);
        }
      });
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [material?.material_id, material?.type, token]);

  if (!material) return null;

  const handleMarkComplete = async () => {
    try {
      setIsMarking(true);
      if (onComplete) {
        await onComplete(material.material_id, 100);
      }
      setLocallyCompleted(true);
    } catch (err) {
      console.error("Error marking complete:", err);
    } finally {
      setIsMarking(false);
    }
  };

  const handleDownload = async () => {
    if (!material?.material_id) return;
    try {
      setDownloading(true);
      setDownloadError("");

      // 1. Request short-lived HMAC signed URL from backend
      let directUrl = null;
      try {
        const signRes = await fetchSignedDownloadUrl(token, material.material_id);
        if (signRes?.data?.download_url) {
          directUrl = `${API_BASE_URL.replace("/api/v1", "")}${signRes.data.download_url}`;
        }
      } catch (signErr) {
        console.warn("Signed URL generation fallback:", signErr.message);
      }

      // 2. Fetch using signed URL or fallback to bearer token download endpoint
      const targetUrl = directUrl || `${API_BASE_URL}/academic/materials/${material.material_id}/download`;
      const headers = directUrl ? {} : (token ? { Authorization: `Bearer ${token}` } : {});
      const response = await fetch(targetUrl, { headers });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || `Download failed with status ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (json.url) {
          window.open(json.url, "_blank");
          return;
        }
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition") || "";
      let downloadName = null;
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      if (match && match[1]) {
        downloadName = decodeURIComponent(match[1].trim());
      }
      if (!downloadName) {
        const rawFileName = material.file_ref ? material.file_ref.split(/[\\/]/).pop() : null;
        if (rawFileName && !/^\d+_[a-f0-9-]+/i.test(rawFileName)) {
          downloadName = rawFileName;
        } else {
          const ext = material.type === "PDF" ? ".pdf" : material.type === "Slide" ? ".pptx" : material.type === "Video" ? ".mp4" : ".txt";
          const safeTitle = (material.title || "academic_material").replace(/[^a-zA-Z0-9_.-]/g, "").replace(/\s+/g, "_");
          downloadName = `${safeTitle}${ext}`;
        }
      }
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      setDownloadError(err.message || "Failed to download material resource from server.");
    } finally {
      setDownloading(false);
    }
  };

  const renderContent = () => {
    switch (material.type) {
      case "PDF":
        return (
          <div className="flex flex-col space-y-4">
            {/* PDF Toolbar */}
            <div className="flex items-center justify-between rounded-xl bg-slate-100 p-2 text-xs text-slate-700">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-800">PDF Document</span>
                <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[11px]">
                  v{material.version} &bull; {material.status}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {fileBlobUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(fileBlobUrl, "_blank")}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-200 font-medium"
                  >
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /> Full Window
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(70, z - 15))}
                  className="rounded-lg p-1 hover:bg-slate-200"
                  title="Zoom Out"
                >
                  <MagnifyingGlassMinusIcon className="h-4 w-4" />
                </button>
                <span className="font-mono text-xs">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(160, z + 15))}
                  className="rounded-lg p-1 hover:bg-slate-200"
                  title="Zoom In"
                >
                  <MagnifyingGlassPlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Frame or Canvas */}
            {fileLoading ? (
              <div className="min-h-[400px] flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
                Loading document stream...
              </div>
            ) : fileBlobUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-inner">
                <iframe
                  src={fileBlobUrl}
                  title={material.title}
                  className="w-full h-[520px] rounded-2xl bg-white"
                />
              </div>
            ) : (
              <div
                className="min-h-[380px] max-h-[500px] overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-inner transition-transform"
                style={{ fontSize: `${zoom}%` }}
              >
                <div className="mx-auto max-w-2xl space-y-4 font-serif text-slate-800 leading-relaxed">
                  <div className="border-b border-slate-200 pb-3">
                    <span className="text-xs uppercase font-sans tracking-widest text-emerald-800 font-bold">
                      Joy University Academic Courseware
                    </span>
                    <h2 className="text-xl font-bold font-sans text-slate-900 mt-1">{material.title}</h2>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      Version {material.version} &bull; Security Scanned: {material.virus_scan_status || "CLEAN"}
                    </p>
                  </div>

                  <div className="whitespace-pre-line text-sm text-slate-700 font-mono bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {material.content || material.description}
                  </div>

                  <p className="text-xs text-slate-600 font-sans">
                    This document contains foundational explanations and materials for enrolled students.
                    Complete this resource to fulfill requirements for topic assessment unlock.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case "Slide": {
        const slides = [
          {
            num: 1,
            title: material.title,
            body: material.content || material.description || "Courseware slide deck overview.",
          },
          {
            num: 2,
            title: "Core Concepts & Analysis",
            body: "Review core definitions, theorems, and practical applications outlined in this lecture.",
          },
          {
            num: 3,
            title: "Summary & Review",
            body: "Ensure all key learning objectives for this unit have been reviewed prior to sitting the topic quiz.",
          },
        ];
        const currentSlide = slides[activeSlide - 1] || slides[0];

        return (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2 text-white">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <PresentationChartBarIcon className="h-4 w-4" /> Presentation Slides
              </span>
              <div className="flex items-center space-x-3 text-xs">
                <span>
                  Slide {activeSlide} of {slides.length}
                </span>
                <div className="flex space-x-1">
                  <button
                    type="button"
                    disabled={activeSlide <= 1}
                    onClick={() => setActiveSlide((s) => Math.max(1, s - 1))}
                    className="rounded p-1 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={activeSlide >= slides.length}
                    onClick={() => setActiveSlide((s) => Math.min(slides.length, s + 1))}
                    className="rounded p-1 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-[320px] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 text-white shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-emerald-300">Slide #{currentSlide.num}</span>
                <h3 className="text-2xl font-bold mt-2 text-white">{currentSlide.title}</h3>
                <div className="mt-4 whitespace-pre-line text-sm text-slate-200 font-sans leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
                  {currentSlide.body}
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center text-xs text-slate-400 border-t border-white/10 pt-3">
                <span>Joy University Department Courseware</span>
                <span>{material.title}</span>
              </div>
            </div>
          </div>
        );
      }

      case "Link": {
        const targetUrl = material.file_ref || material.content || "#";
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-4">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <LinkIcon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{material.title}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{material.description}</p>
              <p className="text-xs font-mono text-emerald-700 mt-2 truncate max-w-sm mx-auto">{targetUrl}</p>
            </div>
            <div>
              <a
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Open Resource in New Tab
              </a>
            </div>
          </div>
        );
      }

      case "Video":
        return (
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black flex flex-col justify-between p-4 shadow-xl">
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full">
                  <PlayIcon className="h-4 w-4 text-emerald-400" /> Recorded Lecture Video
                </span>
                <span className="bg-emerald-600/80 px-2 py-0.5 rounded text-white font-mono text-[11px]">
                  HD Video
                </span>
              </div>

              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div
                  onClick={() => {
                    if (material.file_ref && material.file_ref.startsWith("http")) {
                      window.open(material.file_ref, "_blank");
                    }
                  }}
                  className="h-16 w-16 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-lg hover:scale-105 transition cursor-pointer"
                >
                  <PlayIcon className="h-8 w-8 ml-1" />
                </div>
                <h4 className="text-white font-semibold text-sm max-w-md">{material.title}</h4>
                <p className="text-xs text-slate-300 max-w-sm">{material.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-white text-xs font-mono">
                  <span>{Math.floor((videoProgress / 100) * 14)}:20</span>
                  <span>14:20</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={videoProgress}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setVideoProgress(val);
                    if (val >= 90 && !isCompleted) {
                      handleMarkComplete();
                    }
                  }}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>
            </div>
          </div>
        );

      case "Notes":
      default:
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <BookOpenIcon className="h-4 w-4" /> Comprehensive Lecture Notes
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">{material.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{material.description}</p>
            <div className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-800 leading-relaxed font-sans border border-slate-200/80 whitespace-pre-line">
              {material.content || material.description}
            </div>
          </div>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={material.title} maxWidth="max-w-4xl">
      <div className="space-y-5">
        {/* Header badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                material.required_flag
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {material.required_flag ? "★ Required for Quiz" : "Optional Reference"}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              Format: {material.type}
            </span>
            <span className="text-xs text-slate-500">v{material.version}</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
              {material.status || "Published"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 text-emerald-700" />
              {downloading ? "Downloading..." : "Download Resource"}
            </button>
          </div>
        </div>

        {/* Material Provenance & Information Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-700 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Course Unit</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1 mt-0.5">
                <BookOpenIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                {material.topic_title || material.unit_name || "Course Unit"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Subject</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1 mt-0.5">
                <AcademicCapIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                {material.subject_name || material.code || "Academic Course"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Faculty Uploader</span>
              <span className="font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                <UserIcon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                {material.faculty_name || material.uploader_name || material.author_name || "Faculty Member"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Original Filename</span>
              <span className="font-mono text-[11px] text-slate-800 truncate flex items-center gap-1 mt-0.5" title={material.file_ref ? material.file_ref.split(/[\\/]/).pop() : `${material.title}.pdf`}>
                <DocumentTextIcon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                {material.file_ref ? material.file_ref.split(/[\\/]/).pop() : `${material.title.replace(/\s+/g, "_")}${material.type === "PDF" ? ".pdf" : ""}`}
              </span>
            </div>
          </div>
          {material.description && (
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-slate-600">
              <span className="font-semibold text-slate-700">Description: </span>
              {material.description}
            </div>
          )}
        </div>

        {/* Download Error Notice */}
        {downloadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExclamationCircleIcon className="h-4 w-4 shrink-0 text-red-600" />
              <span>{downloadError}</span>
            </div>
            <button
              type="button"
              onClick={() => setDownloadError("")}
              className="text-red-500 hover:text-red-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dynamic Reader Stage */}
        {renderContent()}

        {/* Footer with Completion Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-slate-100 p-4">
          <div className="flex items-center space-x-2 text-xs">
            {isCompleted ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                Completed &bull; Counts towards Topic Quiz Unlock
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <ClockIcon className="h-4 w-4 text-amber-600" />
                In Progress &bull; View material to complete prerequisite
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isCompleted && (
              <button
                type="button"
                disabled={isMarking}
                onClick={handleMarkComplete}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition"
              >
                <CheckIcon className="h-4 w-4" />
                {isMarking ? "Updating..." : "Mark as Completed"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
