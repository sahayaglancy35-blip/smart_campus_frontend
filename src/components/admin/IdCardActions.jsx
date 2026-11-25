import { useState } from "react";
import {
  ArrowDownTrayIcon,
  PrinterIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";
import { resolveAssetUrl } from "../../api/client";
import { getPhotoPath } from "../../utils/photo";
import Alert from "../common/Alert";
import Modal from "../common/Modal";
import {
  createStudentQrSvg,
  downloadIdCardPdf,
  getIdCardIdentifier,
  openIdCardPrintWindow,
} from "./studentIdCardUtils";

function CardFrame({ side, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        {side}
      </p>
      <article className="relative mx-auto h-[85.6mm] w-[54mm] shrink-0 rounded-[4mm] bg-gradient-to-br from-emerald-300 via-green-700 to-green-950 p-[1.1mm] shadow-xl">
        <div className="relative h-full w-full overflow-hidden rounded-[3mm] border border-white/80 bg-white text-slate-800">
          {children}
          <div className="pointer-events-none absolute inset-[1.3mm] rounded-[2.2mm] border border-emerald-100/90" />
        </div>
      </article>
    </div>
  );
}

function CampusMark({ inverse = false }) {
  return (
    <span
      className={`grid h-[7mm] w-[7mm] shrink-0 place-items-center rounded-full border text-[7px] font-black tracking-tight ${
        inverse
          ? "border-white/60 bg-white text-green-900"
          : "border-green-200 bg-green-900 text-white"
      }`}
    >
      JU
    </span>
  );
}

function CardFront({ record, cardType, identifier, qrUrl }) {
  const [photoError, setPhotoError] = useState(false);
  const photoPath = getPhotoPath(record);
  const isFaculty = cardType === "faculty";
  const initials = String(record.full_name || (isFaculty ? "F" : "S"))
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  return (
    <CardFrame side="Front">
      <header className="absolute inset-x-0 top-0 flex h-[14mm] items-center gap-2.5 bg-gradient-to-r from-[#052f24] via-[#14532d] to-[#052f24] px-[5mm] text-white">
        <CampusMark inverse />
        <div className="min-w-0">
          <strong className="block truncate text-[8px] tracking-[0.08em]">
            JOY UNIVERSITY
          </strong>
          <span className="mt-0.5 block text-[5px] font-medium tracking-[0.12em] text-emerald-100">
            TIRUNELVELI, TAMIL NADU
          </span>
          <span className="mt-0.5 block text-[4px] tracking-[0.14em] text-green-200">
            {isFaculty ? "FACULTY IDENTIFICATION" : "STUDENT IDENTIFICATION"}
          </span>
        </div>
      </header>
      {photoPath && !photoError ? (
        <img
          className="absolute left-1/2 top-[16mm] h-[21mm] w-[21mm] -translate-x-1/2 rounded-full border-[1.2mm] border-white object-cover shadow-[0_0_0_0.7mm_#14532d]"
          src={resolveAssetUrl(photoPath)}
          alt={`${record.full_name || "Campus member"} photograph`}
          onError={() => setPhotoError(true)}
        />
      ) : (
        <div className="absolute left-1/2 top-[16mm] grid h-[21mm] w-[21mm] -translate-x-1/2 place-items-center rounded-full border-[1.2mm] border-white bg-emerald-50 text-xl font-bold text-green-900 shadow-[0_0_0_0.7mm_#14532d]">
          {initials}
        </div>
      )}
      <h2 className="absolute left-[6mm] right-[4mm] top-[38.5mm] line-clamp-2 text-center text-[9px] font-extrabold leading-tight text-[#123b2b]">
        {record.full_name || (isFaculty ? "Faculty" : "Student")}
      </h2>
      <p className="absolute left-[6mm] right-[4mm] top-[43mm] truncate text-center text-[5px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
        {isFaculty
          ? record.designation_name || record.designation || "Faculty"
          : "Student"}
      </p>
      <div className="absolute left-[6mm] right-[4mm] top-[47.5mm] border-t border-emerald-100 pt-[1.2mm]">
        <p className="text-[4px] font-bold tracking-[0.18em] text-slate-500">
          {isFaculty ? "EMPLOYEE ID" : "REGISTER NUMBER"}
        </p>
        <strong className="block truncate text-[7px] font-extrabold tracking-wide text-slate-900">
          {identifier}
        </strong>
      </div>
      <div className="absolute left-[6mm] right-[4mm] top-[55mm]">
        <p className="text-[4px] font-bold tracking-[0.18em] text-slate-500">
          {isFaculty ? "SCHOOL / DEPARTMENT" : "DEPARTMENT"}
        </p>
        <strong className="block truncate text-[6px] font-semibold text-slate-800">
          {isFaculty
            ? record.department_name || record.school_name || "Faculty"
            : record.department_name || "Department not set"}
        </strong>
      </div>
      <div className="absolute left-[6mm] right-[4mm] top-[62mm]">
        <p className="text-[4px] font-bold tracking-[0.18em] text-slate-500">
          {isFaculty ? "SCHOOL" : "ACADEMIC YEAR"}
        </p>
        <strong className="block truncate text-[6px] font-semibold text-slate-800">
          {isFaculty
            ? record.school_name || "Joy University"
            : record.academic_year_label || "Current enrollment"}
        </strong>
      </div>
      <div className="absolute bottom-[5mm] left-[6mm] w-[28mm]">
        <span className="block truncate text-[4px] font-bold tracking-[0.12em] text-green-800">
          OFFICIAL CAMPUS ID
        </span>
        <span className="mt-0.5 block truncate text-[4px] text-slate-500">
          {record.school_name || "Joy University"}
        </span>
      </div>
      <img
        className="absolute bottom-[4.5mm] right-[4mm] h-[12mm] w-[12mm] bg-white p-[0.5mm]"
        src={qrUrl}
        alt={`${isFaculty ? "Employee" : "Register"} identifier QR code`}
      />
      <span className="absolute bottom-[2mm] right-[4mm] w-[12mm] text-center text-[3.5px] font-semibold tracking-wide text-slate-500">
        SCAN TO VERIFY
      </span>
    </CardFrame>
  );
}

function CardBack({ record, cardType, identifier }) {
  const isFaculty = cardType === "faculty";
  const instructions = isFaculty
    ? [
        "Carry this card while on university premises.",
        "Display it when requested by authorized staff.",
        "If found, return it to Joy University, Tirunelveli.",
      ]
    : [
        "Carry this card while on university premises.",
        "Display it when requested by university staff.",
        "If found, return it to Joy University, Tirunelveli.",
      ];

  return (
    <CardFrame side="Back">
      <header className="absolute inset-x-0 top-0 flex h-[20mm] flex-col items-center justify-center bg-gradient-to-br from-[#052f24] via-[#14532d] to-[#052f24] text-white">
        <CampusMark inverse />
        <strong className="mt-1 text-[7px] tracking-[0.12em]">
          JOY UNIVERSITY
        </strong>
        <span className="mt-0.5 text-[4px] font-medium tracking-[0.18em] text-emerald-100">
          TIRUNELVELI, TAMIL NADU
        </span>
      </header>
      <div className="absolute left-[7mm] right-[4mm] top-[23mm]">
        <p className="text-[4px] font-bold tracking-[0.2em] text-emerald-700">
          CAMPUS IDENTIFICATION
        </p>
        <p className="mt-1 line-clamp-2 text-[7px] font-bold leading-tight text-slate-900">
          {record.full_name || (isFaculty ? "Faculty" : "Student")}
        </p>
        <p className="mt-0.5 truncate text-[5px] text-slate-500">
          {isFaculty ? "Employee ID" : "Register No"}: {identifier}
        </p>
      </div>
      <div className="absolute left-[7mm] right-[4mm] top-[39mm] space-y-[3mm]">
        {instructions.map((instruction) => (
          <p
            key={instruction}
            className="flex gap-1.5 text-[5px] leading-[1.4] text-slate-700"
          >
            <span className="mt-[0.5mm] h-[1.3mm] w-[1.3mm] shrink-0 rounded-full bg-emerald-700" />
            <span>{instruction}</span>
          </p>
        ))}
      </div>
      <div className="absolute bottom-[13mm] left-[7mm] right-[4mm]">
        <p className="border-t border-slate-300 pt-[1mm] text-[4px] font-semibold tracking-[0.12em] text-slate-500">
          AUTHORIZED SIGNATURE
        </p>
      </div>
      <div className="absolute inset-x-[5mm] bottom-[4mm] border-t border-emerald-100 pt-[1.5mm] text-center">
        <span className="block text-[4px] font-bold tracking-[0.1em] text-green-900">
          PROPERTY OF JOY UNIVERSITY
        </span>
        <span className="mt-0.5 block text-[3.5px] text-slate-500">
          Tirunelveli, Tamil Nadu
        </span>
      </div>
    </CardFrame>
  );
}

function CardPreview({ record, cardType }) {
  const identifier = getIdCardIdentifier(record, cardType);
  const qrUrl = `data:image/svg+xml,${encodeURIComponent(
    createStudentQrSvg(identifier, cardType),
  )}`;

  return (
    <div className="grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 sm:items-start">
      <CardFront
        record={record}
        cardType={cardType}
        identifier={identifier}
        qrUrl={qrUrl}
      />
      <CardBack record={record} cardType={cardType} identifier={identifier} />
    </div>
  );
}

export function IdCardActions({ onClick, cardType = "student" }) {
  const label = cardType === "faculty" ? "faculty" : "student";
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg p-1.5 text-gray-500 transition hover:bg-green-50 hover:text-green-700"
      title={`Generate ${label} ID card`}
      aria-label={`Generate ${label} ID card`}
    >
      <QrCodeIcon className="h-4 w-4" />
    </button>
  );
}

export function IdCardPreviewModal({ record, cardType = "student", onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  if (!record) return null;

  const isFaculty = cardType === "faculty";
  const label = isFaculty ? "Faculty" : "Student";
  const identifier = getIdCardIdentifier(record, cardType);
  const missingIdentifier = !identifier;

  const handleDownload = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await downloadIdCardPdf(record, cardType);
      setSuccess(`${label} ID card PDF downloaded.`);
    } catch (downloadError) {
      setError(downloadError.message || `Unable to generate the ${label.toLowerCase()} ID card PDF.`);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setError("The print window was blocked. Allow pop-ups and try again.");
      return;
    }
    try {
      openIdCardPrintWindow(record, printWindow, cardType);
      setError("");
      setSuccess(`${label} ID card opened in print layout.`);
    } catch (printError) {
      printWindow.close();
      setError(printError.message || `Unable to prepare the ${label.toLowerCase()} ID card for printing.`);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${label} ID Card Preview`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <p className="text-center text-xs text-gray-500">
          Two-sided portrait · 54 × 85.6 mm per side · QR contains only the{" "}
          {isFaculty ? "employee ID" : "register number"} (no personal details)
        </p>
        {missingIdentifier ? (
          <Alert
            type="error"
            message={`This record has no ${isFaculty ? "employee ID" : "register number"}; an ID card cannot be generated.`}
          />
        ) : (
          <div className="overflow-x-auto py-2">
            <CardPreview
              key={`${cardType}-${identifier}`}
              record={record}
              cardType={cardType}
            />
          </div>
        )}
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={busy || missingIdentifier}
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-green-800 px-3 py-2 text-xs font-semibold text-white hover:bg-green-900 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {busy ? "Creating PDF..." : "Download PDF"}
          </button>
          <button
            type="button"
            disabled={busy || missingIdentifier}
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default IdCardActions;
