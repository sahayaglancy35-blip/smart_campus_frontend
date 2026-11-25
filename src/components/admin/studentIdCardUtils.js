import { getPhotoPath } from "../../utils/photo.js";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  try {
    const origin = new URL(API_BASE_URL, window.location.origin).origin;
    return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  } catch {
    return path.startsWith("/") ? path : `/${path}`;
  }
}

const QR_CAPACITY = {
  1: { data: 19, ecc: 7 },
  2: { data: 34, ecc: 10 },
  3: { data: 55, ecc: 15 },
  4: { data: 80, ecc: 20 },
};

function multiplyGalois(left, right) {
  let result = 0;
  while (right) {
    if (right & 1) result ^= left;
    left <<= 1;
    if (left & 0x100) left ^= 0x11d;
    right >>>= 1;
  }
  return result;
}

function makeErrorCorrection(data, length) {
  let generator = [1];
  let root = 1;
  for (let index = 0; index < length; index += 1) {
    const next = new Array(generator.length + 1).fill(0);
    generator.forEach((value, position) => {
      next[position] ^= value;
      next[position + 1] ^= multiplyGalois(value, root);
    });
    generator = next;
    root = multiplyGalois(root, 2);
  }

  const remainder = [...data, ...new Array(length).fill(0)];
  data.forEach((_, offset) => {
    const factor = remainder[offset];
    if (factor) {
      generator.forEach((value, position) => {
        remainder[offset + position] ^= multiplyGalois(value, factor);
      });
    }
  });
  return remainder.slice(data.length);
}

function appendBits(bits, value, length) {
  for (let offset = length - 1; offset >= 0; offset -= 1) {
    bits.push((value >>> offset) & 1);
  }
}

function getFormatInformation(mask) {
  const value = (1 << 3) | mask;
  let remainder = value << 10;
  while (remainder >= 1 << 10) {
    const shift = Math.floor(Math.log2(remainder)) - 10;
    remainder ^= 0x537 << shift;
  }
  return ((value << 10) | remainder) ^ 0x5412;
}

function createQrMatrix(identifier) {
  const bytes = new TextEncoder().encode(String(identifier));
  const version = [1, 2, 3, 4].find(
    (candidate) => bytes.length <= QR_CAPACITY[candidate].data - 2,
  );
  if (!version) throw new Error("The ID is too long for a QR code.");

  const { data: dataLength, ecc: eccLength } = QR_CAPACITY[version];
  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));

  const capacityBits = dataLength * 8;
  for (let i = 0; i < Math.min(4, capacityBits - bits.length); i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
  }
  for (let pad = 0; data.length < dataLength; pad += 1) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
  }
  const codewords = [...data, ...makeErrorCorrection(data, eccLength)];
  const size = version * 4 + 17;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));

  const setFinder = (centerRow, centerCol) => {
    for (let rowOffset = -4; rowOffset <= 4; rowOffset += 1) {
      for (let colOffset = -4; colOffset <= 4; colOffset += 1) {
        const row = centerRow + rowOffset;
        const col = centerCol + colOffset;
        if (row < 0 || col < 0 || row >= size || col >= size) continue;
        const distance = Math.max(Math.abs(rowOffset), Math.abs(colOffset));
        matrix[row][col] =
          distance !== 2 && distance !== 4 && distance <= 3;
      }
    }
  };
  setFinder(3, 3);
  setFinder(3, size - 4);
  setFinder(size - 4, 3);

  if (version > 1) {
    const center = version * 4 + 10;
    for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
      for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
        const distance = Math.max(Math.abs(rowOffset), Math.abs(colOffset));
        matrix[center + rowOffset][center + colOffset] =
          distance === 2 || distance === 0;
      }
    }
  }

  for (let index = 8; index < size - 8; index += 1) {
    if (matrix[6][index] === null) matrix[6][index] = index % 2 === 0;
    if (matrix[index][6] === null) matrix[index][6] = index % 2 === 0;
  }

  for (let index = 0; index < 15; index += 1) {
    if (index < 6) matrix[index][8] = false;
    else if (index === 6) matrix[7][8] = false;
    else if (index === 7) matrix[8][8] = false;
    else if (index === 8) matrix[8][7] = false;
    else matrix[8][14 - index] = false;

    if (index < 8) matrix[8][size - 1 - index] = false;
    else matrix[size - 15 + index][8] = false;
  }
  matrix[size - 8][8] = true;

  const mask = 0;
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset += 1) {
        const col = right - offset;
        if (matrix[row][col] !== null) continue;
        const value =
          bitIndex < codewords.length * 8
            ? (codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1
            : 0;
        matrix[row][col] = Boolean(value ^ ((row + col) % 2 === 0 ? 1 : 0));
        bitIndex += 1;
      }
    }
    upward = !upward;
  }

  const format = getFormatInformation(mask);
  for (let index = 0; index < 15; index += 1) {
    const bit = Boolean((format >>> index) & 1);
    if (index < 6) matrix[index][8] = bit;
    else if (index === 6) matrix[7][8] = bit;
    else if (index === 7) matrix[8][8] = bit;
    else if (index === 8) matrix[8][7] = bit;
    else matrix[8][14 - index] = bit;

    if (index < 8) matrix[8][size - 1 - index] = bit;
    else matrix[size - 15 + index][8] = bit;
  }
  matrix[size - 8][8] = true;

  return matrix;
}

export function createStudentQrSvg(identifier, cardType = "student") {
  const qrPayload = `${cardType === "faculty" ? "Faculty ID" : "Student ID"}: ${identifier}`;
  const matrix = createQrMatrix(qrPayload);
  const size = matrix.length;
  const blocks = [];
  matrix.forEach((row, rowIndex) => {
    row.forEach((filled, colIndex) => {
      if (filled) blocks.push(`<rect x="${colIndex}" y="${rowIndex}" width="1" height="1"/>`);
    });
  });
  const outerSize = size + 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="-4 -4 ${outerSize} ${outerSize}" shape-rendering="crispEdges"><rect x="-4" y="-4" width="${outerSize}" height="${outerSize}" fill="#fff"/><g fill="#000">${blocks.join("")}</g></svg>`;
}

export function getIdCardIdentifier(record, cardType = "student") {
  if (cardType === "faculty") {
    return String(record?.employee_code || record?.employee_id || record?.faculty_id || "").trim();
  }
  return String(record?.register_no || "").trim();
}

export function idCardFilename(identifier, cardType = "student") {
  const clean = String(identifier || "Record")
    .replace(/[<>:"/\\|?*]/g, "_")
    .trim();
  return `${cardType === "faculty" ? "FacultyID" : "StudentID"}_${clean}.pdf`;
}

function ascii(value) {
  return new TextEncoder().encode(value);
}

function combineBytes(...parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function pdfText(value) {
  return String(value || "")
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/([\\()])/g, "\\$1");
}

function drawText(text, x, y, size, color = "0.12 0.18 0.15") {
  return `${color} rg BT /F1 ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfText(text)}) Tj ET\n`;
}

function drawRect(x, y, width, height, color) {
  return `${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`;
}

function drawOutline(x, y, width, height, color) {
  return `${color} RG 0.6 w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S\n`;
}

function drawCircleOutline(x, y, diameter, color, lineWidth = 0.8) {
  const radius = diameter / 2;
  const control = radius * 0.5522848;
  const centerX = x + radius;
  const centerY = y + radius;
  return `${color} RG ${lineWidth} w ${centerX + radius} ${centerY} m ${centerX + radius} ${centerY + control} ${centerX + control} ${centerY + radius} ${centerX} ${centerY + radius} c ${centerX - control} ${centerY + radius} ${centerX - radius} ${centerY + control} ${centerX - radius} ${centerY} c ${centerX - radius} ${centerY - control} ${centerX - control} ${centerY - radius} ${centerX} ${centerY - radius} c ${centerX + control} ${centerY - radius} ${centerX + radius} ${centerY - control} ${centerX + radius} ${centerY} c S\n`;
}

function drawLine(x1, y1, x2, y2, color, lineWidth = 0.6) {
  return `${color} RG ${lineWidth} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}

function imageDataFromDataUrl(dataUrl) {
  const encoded = dataUrl.split(",")[1];
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function loadPhotoForPdf(student) {
  const path = getPhotoPath(student);
  if (!path) return null;

  try {
    const response = await fetch(resolveAssetUrl(path));
    if (!response.ok) return null;
    const image = new Image();
    image.src = URL.createObjectURL(await response.blob());
    await image.decode();

    const width = 460;
    const height = 460;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.beginPath();
    context.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
    context.clip();
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );
    URL.revokeObjectURL(image.src);
    return {
      bytes: imageDataFromDataUrl(canvas.toDataURL("image/jpeg", 0.9)),
      width,
      height,
    };
  } catch {
    return null;
  }
}

function drawQr(matrix, x, y, size) {
  const quietZone = (size * 4) / (matrix.length + 8);
  const moduleSize = (size - quietZone * 2) / matrix.length;
  let commands = drawRect(x, y, size, size, "1 1 1");
  matrix.forEach((row, rowIndex) => {
    row.forEach((filled, colIndex) => {
      if (!filled) return;
      const moduleX = x + quietZone + colIndex * moduleSize;
      const moduleY = y + quietZone + (matrix.length - 1 - rowIndex) * moduleSize;
      commands += drawRect(moduleX, moduleY, moduleSize, moduleSize, "0 0 0");
    });
  });
  return commands;
}

function drawCenteredText(text, y, size, color, pageWidth) {
  const estimatedWidth = String(text).length * size * 0.5;
  return drawText(text, Math.max(0, (pageWidth - estimatedWidth) / 2), y, size, color);
}

async function createCardContent(record, photoName, cardType, side) {
  const mm = (value) => (value * 72) / 25.4;
  const width = 54;
  const height = 85.6;
  const pageWidth = mm(width);
  const isFaculty = cardType === "faculty";
  const name = String(record.full_name || (isFaculty ? "Faculty" : "Student")).trim();
  const identifier = getIdCardIdentifier(record, cardType);
  const typeLabel = isFaculty ? "FACULTY" : "STUDENT";
  let content = "q\n";
  content += drawRect(0, 0, pageWidth, mm(height), "0.04 0.31 0.16");
  content += drawRect(mm(1.2), mm(1.2), mm(51.6), mm(83.2), "1 1 1");
  content += drawOutline(mm(1.2), mm(1.2), mm(51.6), mm(83.2), "0.73 0.86 0.96");

  if (side === "back") {
    content += drawRect(mm(1.3), mm(68), mm(51.4), mm(15), "0.03 0.19 0.11");
    content += drawRect(mm(23.5), mm(77.5), mm(7), mm(7), "0.08 0.40 0.20");
    content += drawText("JU", mm(25.1), mm(80), 8, "1 1 1");
    content += drawCenteredText("JOY UNIVERSITY", mm(74), 8, "1 1 1", pageWidth);
    content += drawCenteredText(
      "TIRUNELVELI, TAMIL NADU",
      mm(70.8),
      4.5,
      "0.78 0.89 0.98",
      pageWidth,
    );
    content += drawText("CAMPUS IDENTIFICATION", mm(7), mm(63), 5, "0.07 0.36 0.19");
    content += drawText(name.slice(0, 34), mm(7), mm(58.5), 8, "0.08 0.15 0.30");
    content += drawText(
      `${isFaculty ? "EMPLOYEE ID" : "REGISTER NO"}: ${identifier}`.slice(0, 42),
      mm(7),
      mm(54.5),
      5,
      "0.35 0.41 0.51",
    );
    const instructions = [
      "Carry this card on university premises.",
      "Present it to university staff when requested.",
      "If found, return to Joy University, Tirunelveli.",
    ];
    instructions.forEach((instruction, index) => {
      const y = mm(46 - index * 9);
      content += drawRect(mm(7), y + mm(0.5), mm(1.3), mm(1.3), "0.07 0.45 0.22");
      content += drawText(instruction, mm(10), y, 5, "0.22 0.28 0.37");
    });
    content += drawLine(mm(30), mm(16), mm(48), mm(16), "0.49 0.57 0.67", 0.7);
    content += drawText("AUTHORIZED SIGNATURE", mm(30), mm(13), 4, "0.38 0.45 0.55");
    content += drawLine(mm(5), mm(9), mm(49), mm(9), "0.82 0.88 0.94", 0.5);
    content += drawCenteredText(
      "PROPERTY OF JOY UNIVERSITY - TIRUNELVELI",
      mm(5),
      4,
      "0.07 0.29 0.16",
      pageWidth,
    );
    content += "Q\n";
    return ascii(content);
  }

  const department = String(
    isFaculty
      ? record.department_name || record.school_name || "Faculty"
      : record.department_name || "Department not set",
  );
  const academicYear = isFaculty
    ? record.school_name || "Joy University"
    : record.academic_year_label || "Current enrollment";

  content += drawRect(mm(1.3), mm(72.5), mm(51.4), mm(11), "0.03 0.19 0.11");
  content += drawRect(mm(4), mm(74.5), mm(7), mm(7), "0.08 0.40 0.20");
  content += drawText("JU", mm(5.6), mm(77), 8, "1 1 1");
  content += drawText("JOY UNIVERSITY", mm(14), mm(80), 8, "1 1 1");
  content += drawText("TIRUNELVELI, TAMIL NADU", mm(14), mm(76.5), 4.5, "0.79 0.91 0.82");
  content += drawText(`${typeLabel} IDENTIFICATION`, mm(14), mm(73.5), 4, "0.68 0.85 0.70");

  if (photoName) {
    content += `q ${mm(21)} 0 0 ${mm(21)} ${mm(16.5)} ${mm(47)} cm /${photoName} Do Q\n`;
  } else {
    content += drawRect(mm(16.5), mm(47), mm(21), mm(21), "0.89 0.96 0.91");
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase();
    content += drawCenteredText(initials || (isFaculty ? "F" : "S"), mm(55), 22, "0.08 0.32 0.17", pageWidth);
  }
  content += drawCircleOutline(mm(16.5), mm(47), mm(21), "0.08 0.39 0.20", 1.4);
  content += drawCenteredText(name.slice(0, 34), mm(43.5), 8.5, "0.07 0.15 0.31", pageWidth);
  content += drawCenteredText(
    isFaculty
      ? `DESIGNATION: ${String(record.designation_name || record.designation || "FACULTY").toUpperCase()}`
      : "STUDENT",
    mm(40.5),
    4.5,
    "0.07 0.40 0.20",
    pageWidth,
  );
  content += drawLine(mm(6), mm(38), mm(48), mm(38), "0.84 0.89 0.94", 0.5);
  content += drawText(isFaculty ? "EMPLOYEE ID" : "REGISTER NUMBER", mm(6), mm(35), 4, "0.39 0.45 0.54");
  content += drawText(identifier.slice(0, 34), mm(6), mm(32), 7, "0.08 0.13 0.23");
  content += drawText(isFaculty ? "SCHOOL / DEPARTMENT" : "DEPARTMENT", mm(6), mm(27), 4, "0.39 0.45 0.54");
  content += drawText(department.slice(0, 32), mm(6), mm(24), 5.5, "0.08 0.13 0.23");
  content += drawText(isFaculty ? "SCHOOL" : "ACADEMIC YEAR", mm(6), mm(19), 4, "0.39 0.45 0.54");
  content += drawText(String(academicYear).slice(0, 32), mm(6), mm(16), 5, "0.08 0.13 0.23");
  content += drawText("OFFICIAL CAMPUS ID", mm(6), mm(8), 4, "0.07 0.29 0.16");
  content += drawText(
    String(record.school_name || "Joy University").slice(0, 25),
    mm(6),
    mm(5),
    3.8,
    "0.39 0.45 0.54",
  );
  const qrPayload = `${isFaculty ? "Faculty ID" : "Student ID"}: ${identifier}`;
  content += drawQr(createQrMatrix(qrPayload), mm(38), mm(5), mm(12));
  content += drawText("SCAN TO VERIFY", mm(37.8), mm(3), 3.5, "0.39 0.45 0.54");
  content += "Q\n";
  return ascii(content);
}

function createPdfObject(content) {
  return ascii(`${content}\n`);
}

export async function createIdCardsPdf(records, cardType = "student") {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Select at least one student to create an ID card PDF.");
  }
  if (records.some((record) => !getIdCardIdentifier(record, cardType))) {
    const field = cardType === "faculty" ? "employee ID" : "register number";
    throw new Error(`Every selected record must have a ${field} to create an ID card.`);
  }

  const objects = [
    null,
    null,
    createPdfObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
  ];
  const pageReferences = [];
  const scale = 72 / 25.4;
  const pageWidth = (54 * scale).toFixed(3);
  const pageHeight = (85.6 * scale).toFixed(3);

  for (const record of records) {
    const photo = await loadPhotoForPdf(record);
    let imageReference = "";
    let imageName = "";
    if (photo) {
      imageName = "Im0";
      const imageId = objects.length + 1;
      const imageObject = combineBytes(
        ascii(
          `<< /Type /XObject /Subtype /Image /Width ${photo.width} /Height ${photo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${photo.bytes.length} >>\nstream\n`,
        ),
        photo.bytes,
        ascii("\nendstream"),
      );
      objects.push(imageObject);
      imageReference = `/${imageName} ${imageId} 0 R`;
    }

    for (const side of ["front", "back"]) {
      const content = await createCardContent(
        record,
        side === "front" ? imageName : "",
        cardType,
        side,
      );
      const contentId = objects.length + 1;
      objects.push(
        combineBytes(
          ascii(`<< /Length ${content.length} >>\nstream\n`),
          content,
          ascii("endstream"),
        ),
      );

      const pageId = objects.length + 1;
      const xObjects =
        side === "front" && imageReference
          ? `/XObject << ${imageReference} >>`
          : "";
      objects.push(
        createPdfObject(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> ${xObjects} >> /Contents ${contentId} 0 R >>`,
        ),
      );
      pageReferences.push(`${pageId} 0 R`);
    }
  }

  objects[0] = createPdfObject(
    "<< /Type /Catalog /Pages 2 0 R >>",
  );
  objects[1] = createPdfObject(
    `<< /Type /Pages /Kids [${pageReferences.join(" ")}] /Count ${pageReferences.length} >>`,
  );

  const parts = [
    combineBytes(ascii("%PDF-1.4\n%"), new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]), ascii("\n")),
  ];
  const offsets = [0];
  let position = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(position);
    const wrapped = combineBytes(ascii(`${index + 1} 0 obj\n`), object, ascii("\nendobj\n"));
    parts.push(wrapped);
    position += wrapped.length;
  });
  const xrefOffset = position;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(ascii(xref));
  return new Blob([combineBytes(...parts)], { type: "application/pdf" });
}

export async function downloadIdCardPdf(record, cardType = "student") {
  const identifier = getIdCardIdentifier(record, cardType);
  const blob = await createIdCardsPdf([record], cardType);
  const filename = idCardFilename(identifier, cardType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function openIdCardPrintWindow(record, printWindow, cardType = "student") {
  const isFaculty = cardType === "faculty";
  const identifier = getIdCardIdentifier(record, cardType);
  if (!identifier) {
    throw new Error(`This record has no ${isFaculty ? "employee ID" : "register number"} to print.`);
  }
  const photoPath = getPhotoPath(record);
  const photo = photoPath
    ? `<img class="photo" src="${escapeHtml(resolveAssetUrl(photoPath))}" alt="">`
    : `<div class="photo missing">${escapeHtml(
        String(record.full_name || (isFaculty ? "F" : "S"))
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0] || "")
          .join("")
          .toUpperCase(),
      )}</div>`;
  const qr = `data:image/svg+xml,${encodeURIComponent(
    createStudentQrSvg(identifier, cardType),
  )}`;
  const name = escapeHtml(record.full_name || (isFaculty ? "Faculty" : "Student"));
  const department = escapeHtml(
    isFaculty
      ? record.department_name || record.school_name || "Faculty"
      : record.department_name || "Department not set",
  );
  const schoolOrYear = escapeHtml(
    isFaculty
      ? record.school_name || "Joy University"
      : record.academic_year_label || "Current enrollment",
  );
  const role = escapeHtml(
    isFaculty
      ? `DESIGNATION: ${record.designation_name || record.designation || "Faculty"}`
      : "Student",
  );
  const front = `<article class="card front"><div class="inner">
      <header class="front-header"><span class="mark">JU</span><div><strong>JOY UNIVERSITY</strong><small>TIRUNELVELI, TAMIL NADU</small><em>${isFaculty ? "FACULTY IDENTIFICATION" : "STUDENT IDENTIFICATION"}</em></div></header>
      ${photo}
      <h2 class="name">${name}</h2>
      <p class="role">${role}</p>
      <section class="details">
        <label>${isFaculty ? "EMPLOYEE ID" : "REGISTER NUMBER"}</label><strong>${escapeHtml(identifier)}</strong>
        <label>${isFaculty ? "SCHOOL / DEPARTMENT" : "DEPARTMENT"}</label><strong>${department}</strong>
        <label>${isFaculty ? "SCHOOL" : "ACADEMIC YEAR"}</label><strong>${schoolOrYear}</strong>
      </section>
      <span class="official">OFFICIAL CAMPUS ID</span>
      <small class="school">${escapeHtml(record.school_name || "Joy University")}</small>
      <img class="qr" src="${qr}" alt="QR code for ${escapeHtml(identifier)}">
      <small class="scan">SCAN TO VERIFY</small>
    </div></article>`;
  const back = `<article class="card back"><div class="inner">
      <header class="back-header"><span class="mark">JU</span><strong>JOY UNIVERSITY</strong><small>TIRUNELVELI, TAMIL NADU</small></header>
      <section class="back-details">
        <label>CAMPUS IDENTIFICATION</label>
        <strong>${name}</strong>
        <span>${isFaculty ? "Employee ID" : "Register No"}: ${escapeHtml(identifier)}</span>
      </section>
      <ul class="instructions">
        <li>Carry this card on university premises.</li>
        <li>Present it to university staff when requested.</li>
        <li>If found, return to Joy University, Tirunelveli.</li>
      </ul>
      <div class="signature"><span>AUTHORIZED SIGNATURE</span></div>
      <footer><strong>PROPERTY OF JOY UNIVERSITY</strong><small>Tirunelveli, Tamil Nadu</small></footer>
    </div></article>`;
  const title = idCardFilename(identifier, cardType).replace(/\.pdf$/i, "");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: 54mm 85.6mm; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #172033; }
      html, body, .card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .card { position: relative; width: 54mm; height: 85.6mm; margin: 0; padding: 1.1mm; overflow: hidden; border-radius: 4mm; background: linear-gradient(135deg,#4ade80 0%,#15803d 48%,#052e16 100%); }
      .inner { position: relative; width: 100%; height: 100%; overflow: hidden; border: .25mm solid #dce8f6; border-radius: 3mm; background: #fff; }
      .front-header { position: absolute; z-index: 1; top: 0; right: 0; left: 0; display: flex; align-items: center; gap: 2.5mm; height: 14mm; padding: 0 5mm; color: white; background: linear-gradient(100deg,#052f24,#14532d,#052f24); }
      .mark { display: grid; flex: 0 0 7mm; width: 7mm; height: 7mm; place-items: center; border: .25mm solid #d1fae5; border-radius: 50%; background: #fff; color: #14532d; font-size: 7pt; font-weight: 900; }
      .front-header strong { display: block; font-size: 8pt; letter-spacing: .5pt; }
      .front-header small { display: block; margin-top: .4mm; color: #d1fae5; font-size: 5pt; letter-spacing: .5pt; }
      .front-header em { display: block; margin-top: .4mm; color: #bbf7d0; font-size: 4pt; font-style: normal; letter-spacing: .55pt; }
      .photo { position: absolute; z-index: 1; top: 16mm; left: 16.5mm; width: 21mm; height: 21mm; border: 1mm solid white; border-radius: 50%; object-fit: cover; background: #e9f7ed; box-shadow: 0 0 0 .7mm #14532d; }
      .photo.missing { display: grid; place-items: center; color: #14532d; font-size: 22pt; font-weight: bold; }
      .name { position: absolute; top: 38.5mm; right: 4mm; left: 6mm; margin: 0; overflow: hidden; text-align: center; color: #123b2b; font-size: 8pt; font-weight: 800; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }
      .role { position: absolute; top: 43mm; right: 4mm; left: 6mm; margin: 0; overflow: hidden; text-align: center; color: #15803d; font-size: 5pt; font-weight: 700; letter-spacing: .8pt; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
      .details { position: absolute; top: 47.5mm; right: 4mm; left: 6mm; border-top: .25mm solid #dcfce7; padding-top: 1.2mm; }
      .details label { display: block; margin-top: 1mm; color: #667085; font-size: 4pt; font-weight: 700; letter-spacing: .7pt; }
      .details label:first-child { margin-top: 0; }
      .details strong { display: block; margin-top: .4mm; overflow: hidden; color: #202b3d; font-size: 6pt; font-weight: 700; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
      .official { position: absolute; bottom: 5mm; left: 6mm; width: 28mm; color: #14532d; font-size: 4pt; font-weight: 800; letter-spacing: .4pt; }
      .school { position: absolute; bottom: 2.8mm; left: 6mm; width: 28mm; overflow: hidden; color: #667085; font-size: 3.5pt; text-overflow: ellipsis; white-space: nowrap; }
      .qr { position: absolute; right: 4mm; bottom: 4.5mm; width: 12mm; height: 12mm; background: white; padding: .5mm; }
      .scan { position: absolute; right: 4mm; bottom: 2mm; width: 12mm; text-align: center; color: #667085; font-size: 3.5pt; font-weight: bold; }
      .back-header { position: absolute; top: 0; right: 0; left: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 20mm; color: white; background: linear-gradient(135deg,#052f24,#14532d,#052f24); }
      .back-header strong { margin-top: 1mm; font-size: 7pt; letter-spacing: .65pt; }
      .back-header small { margin-top: .5mm; color: #d1fae5; font-size: 4pt; letter-spacing: .6pt; }
      .back-details { position: absolute; top: 23mm; right: 4mm; left: 7mm; }
      .back-details label { display: block; color: #15803d; font-size: 4pt; font-weight: 800; letter-spacing: .8pt; }
      .back-details strong { display: block; margin-top: 1mm; overflow: hidden; color: #172033; font-size: 7pt; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
      .back-details span { display: block; margin-top: .5mm; color: #667085; font-size: 5pt; }
      .instructions { position: absolute; top: 39mm; right: 4mm; left: 7mm; margin: 0; padding: 0; list-style: none; }
      .instructions li { position: relative; margin-bottom: 3mm; padding-left: 3mm; color: #3c4658; font-size: 5pt; line-height: 1.4; }
      .instructions li::before { position: absolute; top: .7mm; left: 0; width: 1.3mm; height: 1.3mm; border-radius: 50%; background: #15803d; content: ""; }
      .signature { position: absolute; right: 4mm; bottom: 13mm; left: 30mm; border-top: .25mm solid #7d8ba0; padding-top: 1mm; color: #667085; font-size: 4pt; font-weight: 700; letter-spacing: .5pt; }
      .back footer { position: absolute; right: 5mm; bottom: 4mm; left: 5mm; border-top: .25mm solid #dcfce7; padding-top: 1.5mm; text-align: center; }
      .back footer strong { display: block; color: #14532d; font-size: 4pt; letter-spacing: .4pt; }
      .back footer small { display: block; margin-top: .5mm; color: #667085; font-size: 3.5pt; }
      @media screen { body { width: 54mm; margin: 16px auto; } .card { margin-bottom: 16px; box-shadow: 0 4px 20px #14532d33; } }
      @media print { .card:not(:last-child) { break-after: page; page-break-after: always; } }
    </style></head><body>${front}${back}<script>window.onload = () => setTimeout(() => window.print(), 300);</script></body></html>`);
  printWindow.document.close();
}
