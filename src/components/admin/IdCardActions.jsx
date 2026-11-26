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
      <article className="relative mx-auto h-[85.6mm] w-[54mm] shrink-0 overflow-hidden rounded-[3.5mm] bg-[#edf4f6] shadow-xl border border-slate-200/60">
        <div className="relative h-full w-full overflow-hidden bg-[#edf4f6] text-[#123d53]">
          {children}
        </div>
      </article>
    </div>
  );
}

function JoyUniversityLogo() {
  return (
    <div className="flex flex-col items-center">
      {/* Exact Joy University stylized 'JU' emblem */}
      <svg
        aria-hidden="true"
        className="h-[7.2mm] w-[8.5mm]"
        viewBox="0 0 40 34"
        fill="none"
      >
        {/* Left red U leg with circular notch */}
        <path
          d="M6 2 h11 v18 c0 6 -4 10 -9.5 10 C3.5 30 2 27 2 21 V2 Z"
          fill="#9e2a37"
        />
        {/* Right curved slate U/J stem */}
        <path
          d="M17 2 h15 v18 c0 7 -5 11 -11 11 c-3 0 -5.5 -1 -7.5 -3 c3 -2 4.5 -5 4.5 -9 V2 Z"
          fill="#607686"
        />
        {/* Lower intersection circle */}
        <circle cx="17.5" cy="19.5" r="5.2" fill="#edf4f6" />
      </svg>
      {/* JOY UNIVERSITY serif typography */}
      <span
        className="mt-0.5 tracking-[0.14em] text-[9.5px] font-normal leading-none text-[#2d3748]"
        style={{ fontFamily: "'Cinzel', 'Times New Roman', Georgia, serif", letterSpacing: "0.12em" }}
      >
        JOY UNIVERSITY
      </span>
    </div>
  );
}

function CardFront({ record, cardType, identifier, qrUrl }) {
  const [photoError, setPhotoError] = useState(false);
  const photoPath = getPhotoPath(record);
  const isFaculty = cardType === "faculty";

  return (
    <CardFrame side="Front">
      {/* Physical card decorative corner accents */}
      {/* Top-left black/dark slate angled shape */}
      <div
        className="absolute left-0 top-[16mm] h-[8.5mm] w-[12mm] bg-[#1a202c]"
        style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
      />
      {/* Top-right black/dark slate angled shape */}
      <div
        className="absolute right-0 top-0 h-[7mm] w-[11mm] bg-[#1a202c]"
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      />
      {/* Bottom-left black/dark slate angled accent */}
      <div
        className="absolute bottom-0 left-0 h-[6.5mm] w-[11mm] bg-[#1a202c]"
        style={{ clipPath: "polygon(0 0, 0 100%, 100% 100%)" }}
      />
      {/* Bottom-right black/dark slate angled accent */}
      <div
        className="absolute bottom-0 right-0 h-[6.5mm] w-[11mm] bg-[#1a202c]"
        style={{ clipPath: "polygon(100% 0, 0 100%, 100% 100%)" }}
      />

      {/* Top Header line with thin separator */}
      <div className="absolute left-[3mm] right-[3mm] top-[17.5mm] border-b-[0.6px] border-[#2d3748]/70" />

      {/* University Brand Header */}
      <header className="absolute left-0 right-0 top-[3mm] z-10 flex flex-col items-center justify-center">
        <JoyUniversityLogo />
      </header>

      {/* Photo with rounded rectangular border */}
      <div className="absolute left-1/2 top-[19.5mm] z-10 -translate-x-1/2">
        {photoPath && !photoError ? (
          <img
            className="h-[27mm] w-[23.5mm] rounded-[3mm] border-[0.6px] border-[#2d3748] bg-white object-cover shadow-sm"
            src={resolveAssetUrl(photoPath)}
            alt={`${record.full_name || "Campus member"} photograph`}
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div className="grid h-[27mm] w-[23.5mm] place-items-center rounded-[3mm] border-[0.6px] border-[#2d3748] bg-white text-lg font-bold text-[#2d3748] shadow-sm">
            {String(record.full_name || (isFaculty ? "F" : "S"))
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0] || "")
              .join("")
              .toUpperCase()}
          </div>
        )}
      </div>

      {/* Student/Faculty Full Name - Reddish Brown / Burgundy font */}
      <h2
        className="absolute left-[2mm] right-[2mm] top-[49.5mm] text-center text-[8.5px] font-bold uppercase tracking-[0.04em] text-[#822a36]"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
      >
        {record.full_name || (isFaculty ? "Faculty Name" : "Student Name")}
      </h2>

      {/* Register Number / Employee ID - Bold Black */}
      <p
        className="absolute left-[2mm] right-[2mm] top-[54.5mm] text-center text-[9.5px] font-bold tracking-[0.05em] text-[#1a202c]"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
      >
        {identifier}
      </p>

      {/* School / Department Name */}
      <p
        className="absolute left-[1.5mm] right-[1.5mm] top-[59.5mm] text-center text-[7.5px] font-bold leading-tight text-[#1a202c]"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
      >
        {record.school_name ||
          record.department_name ||
          (isFaculty ? "Department of Faculty" : "School of Computational Intelligence")}
      </p>

      {/* Registrar Authentic Signature */}
      <div className="absolute bottom-[9mm] left-0 right-0 flex justify-center">
        <svg
          className="h-[6.5mm] w-[22mm]"
          viewBox="0 0 100 35"
          fill="none"
          stroke="#4a6572"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Fluid realistic registrar signature stroke matching photo */}
          <path d="M12 28 C18 10, 26 2, 28 8 C30 18, 22 28, 38 22 C46 17, 48 9, 52 14 C56 22, 60 26, 68 20 C74 15, 78 22, 86 18 M20 23 L88 23" />
        </svg>
      </div>

      {/* Registrar Title */}
      <p
        className="absolute bottom-[5.5mm] left-0 right-0 text-center text-[7.5px] font-bold text-[#1a202c]"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
      >
        Registrar
      </p>

      {/* Issuing Authority Tag */}
      <p
        className="absolute bottom-[2.5mm] left-0 right-0 text-center text-[6px] font-normal tracking-[0.1em] text-[#2d3748]"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
      >
        ISSUING AUTHORITY
      </p>
      {qrUrl && <span className="hidden">{qrUrl}</span>}
    </CardFrame>
  );
}

function CardBack({ record, cardType, identifier }) {
  const isFaculty = cardType === "faculty";
  const batch =
    record.batch_label ||
    record.batch_name ||
    record.academic_year_label ||
    "2023-24";
  const bloodGroup = record.blood_group || "AB+";
  const dobValue = record.date_of_birth;
  let dateOfBirth = "23/01/2006";
  if (dobValue) {
    const date = new Date(dobValue);
    if (!Number.isNaN(date.getTime())) {
      dateOfBirth = `${String(date.getUTCDate()).padStart(2, "0")}/${String(
        date.getUTCMonth() + 1,
      ).padStart(2, "0")}/${date.getUTCFullYear()}`;
    }
  }
  const address =
    record.address ||
    record.address_line ||
    record.permanent_address ||
    "10/66/13 LHL Nagar\nViswasapuram,Thov\nalai, Kanniyakumari,\n629302";

  const instructions = [
    "This Identity Card is non-transferable.",
    "If this ID card is lost/found kindly return to theissuing authority.",
    "This card must be worn visibly by studentduring his or her presence in Joy University premises. It must be shown to authorizedpersonnel as and when requested.",
  ];

  return (
    <CardFrame side="Back">
      {/* Top angled dark band accent matching physical sample */}
      <div
        className="absolute right-0 top-0 h-[6mm] w-[26mm] bg-[#1a202c]"
        style={{ clipPath: "polygon(28% 0, 100% 0, 72% 100%, 0% 100%)" }}
      />
      {/* Bottom angled dark corner accents */}
      <div
        className="absolute bottom-0 left-0 h-[5.5mm] w-[9mm] bg-[#1a202c]"
        style={{ clipPath: "polygon(0 0, 0 100%, 100% 100%)" }}
      />
      <div
        className="absolute bottom-0 right-0 h-[5.5mm] w-[9mm] bg-[#1a202c]"
        style={{ clipPath: "polygon(100% 0, 0 100%, 100% 100%)" }}
      />

      {/* Top Demographic Details: Batch, Blood Group, Date of Birth, Address */}
      <div
        className="absolute left-[3.5mm] right-[3mm] top-[7.5mm] space-y-[1.8mm] text-[8.5px] leading-tight text-[#1a202c]"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
      >
        <p className="flex">
          <span className="w-[18mm] font-normal">Batch</span>
          <span className="w-[3mm] font-bold">:</span>
          <strong className="flex-1 font-bold">{batch}</strong>
        </p>
        <p className="flex">
          <span className="w-[18mm] font-normal">Blood Group</span>
          <span className="w-[3mm] font-bold">:</span>
          <strong className="flex-1 font-bold">{bloodGroup}</strong>
        </p>
        <p className="flex">
          <span className="w-[18mm] font-normal">Date of Birth</span>
          <span className="w-[3mm] font-bold">:</span>
          <strong className="flex-1 font-bold">{dateOfBirth}</strong>
        </p>
        <p className="flex items-start">
          <span className="w-[18mm] font-normal shrink-0">Address</span>
          <span className="w-[3mm] font-bold shrink-0">:</span>
          <strong className="flex-1 font-bold whitespace-pre-line text-[8px] leading-[1.15]">
            {address}
          </strong>
        </p>
      </div>

      {/* INSTRUCTIONS Header & Bullet Points */}
      <div className="absolute left-[3.5mm] right-[3mm] top-[37.5mm]">
        <h3
          className="text-[9px] font-bold uppercase tracking-[0.05em] text-[#822a36]"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          INSTRUCTIONS
        </h3>
        <ul
          className="mt-[1.2mm] space-y-[1.5mm] text-[6.8px] leading-[1.2] text-[#1a202c]"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          {instructions.map((instruction) => (
            <li key={instruction} className="flex items-start gap-[1.5mm]">
              <span className="mt-[1.2mm] h-[1.2mm] w-[1.2mm] shrink-0 rounded-full bg-[#822a36]" />
              <span className="flex-1">{instruction}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CONTACT Section */}
      <div className="absolute bottom-[11.5mm] left-[3.5mm] right-[3mm]">
        <h3
          className="text-[9px] font-bold uppercase tracking-[0.05em] text-[#822a36]"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          CONTACT
        </h3>
        {/* Phone row with red telephone icon */}
        <p
          className="mt-[1mm] flex items-center gap-[1.8mm] text-[7.5px] font-bold text-[#1a202c]"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          <span className="flex h-[3.2mm] w-[3.2mm] items-center justify-center rounded-sm bg-[#9e2a37] text-[5px] text-white">
            📞
          </span>
          <span>+91 4637 - 231812</span>
        </p>
        {/* Email row with red envelope icon */}
        <p
          className="mt-[1mm] flex items-center gap-[1.8mm] text-[7.5px] font-bold text-[#1a202c]"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          <span className="flex h-[3.2mm] w-[3.2mm] items-center justify-center rounded-sm bg-[#9e2a37] text-[5px] text-white">
            ✉
          </span>
          <span>oor@joyuniversity.edu.in</span>
        </p>
      </div>

      {/* High-fidelity full-width 1D Barcode at card footer */}
      <div
        className="absolute inset-x-[1.5mm] bottom-[1mm] h-[8mm]"
        style={{
          background:
            "repeating-linear-gradient(90deg, #1a202c 0, #1a202c 0.55mm, transparent 0.55mm, transparent 0.95mm, #1a202c 0.95mm, #1a202c 1.6mm, transparent 1.6mm, transparent 2.1mm, #1a202c 2.1mm, #1a202c 2.45mm, transparent 2.45mm, transparent 3.1mm)",
        }}
      />
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
