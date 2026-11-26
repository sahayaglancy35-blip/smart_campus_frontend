import { getPhotoPath } from "../../utils/photo.js";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  try {
    const fallbackOrigin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const origin = new URL(API_BASE_URL, fallbackOrigin).origin;
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
  const fontSize = size * 0.75;
  return `${color} rg BT /F1 ${fontSize.toFixed(2)} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfText(text)}) Tj ET\n`;
}

function drawRect(x, y, width, height, color) {
  return `${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`;
}

function roundedRectPath(x, y, width, height, radius) {
  const control = radius * 0.5522848;
  return `${(x + radius).toFixed(2)} ${y.toFixed(2)} m ${(x + width - radius).toFixed(2)} ${y.toFixed(2)} l ${(x + width - radius + control).toFixed(2)} ${y.toFixed(2)} ${(x + width).toFixed(2)} ${(y + radius - control).toFixed(2)} ${(x + width).toFixed(2)} ${(y + radius).toFixed(2)} c ${(x + width).toFixed(2)} ${(y + height - radius).toFixed(2)} l ${(x + width).toFixed(2)} ${(y + height - radius + control).toFixed(2)} ${(x + width - radius + control).toFixed(2)} ${(y + height).toFixed(2)} ${(x + width - radius).toFixed(2)} ${(y + height).toFixed(2)} c ${(x + radius).toFixed(2)} ${(y + height).toFixed(2)} l ${(x + radius - control).toFixed(2)} ${(y + height).toFixed(2)} ${x.toFixed(2)} ${(y + height - radius + control).toFixed(2)} ${x.toFixed(2)} ${(y + height - radius).toFixed(2)} c ${x.toFixed(2)} ${(y + radius).toFixed(2)} ${x.toFixed(2)} ${(y + radius - control).toFixed(2)} ${(x + radius - control).toFixed(2)} ${y.toFixed(2)} ${(x + radius).toFixed(2)} ${y.toFixed(2)} c h`;
}

function drawRoundedRect(x, y, width, height, radius, color) {
  return `${color} rg ${roundedRectPath(x, y, width, height, radius)} f\n`;
}

function drawRoundedGradient(x, y, width, height, radius) {
  const stops = [
    { position: 0, color: [0.29, 0.85, 0.5] },
    { position: 0.48, color: [0.08, 0.5, 0.24] },
    { position: 1, color: [0.02, 0.18, 0.09] },
  ];
  const steps = 32;
  const stripHeight = height / steps;
  let commands = `q\n${roundedRectPath(x, y, width, height, radius)} W n\n`;

  for (let index = 0; index < steps; index += 1) {
    const position = 1 - (index + 0.5) / steps;
    const stopIndex = stops.findIndex((stop, currentIndex) => {
      const nextStop = stops[currentIndex + 1];
      return position >= stop.position && (!nextStop || position <= nextStop.position);
    });
    const start = stops[stopIndex];
    const end = stops[Math.min(stopIndex + 1, stops.length - 1)];
    const amount = (position - start.position) / (end.position - start.position || 1);
    const color = start.color
      .map((channel, channelIndex) =>
        (channel + (end.color[channelIndex] - channel) * amount).toFixed(3),
      )
      .join(" ");
    commands += drawRect(x, y + index * stripHeight, width, stripHeight + 0.1, color);
  }

  return `${commands}Q\n`;
}

function drawRoundedOutline(x, y, width, height, radius, color, lineWidth = 0.6) {
  return `${color} RG ${lineWidth} w ${roundedRectPath(x, y, width, height, radius)} S\n`;
}

function drawCircle(x, y, diameter, fillColor, strokeColor, lineWidth = 0.8) {
  const radius = diameter / 2;
  const control = radius * 0.5522848;
  const centerX = x + radius;
  const centerY = y + radius;
  let commands = `${fillColor} rg ${(centerX + radius).toFixed(2)} ${centerY.toFixed(2)} m ${(centerX + radius).toFixed(2)} ${(centerY + control).toFixed(2)} ${(centerX + control).toFixed(2)} ${(centerY + radius).toFixed(2)} ${centerX.toFixed(2)} ${(centerY + radius).toFixed(2)} c ${(centerX - control).toFixed(2)} ${(centerY + radius).toFixed(2)} ${(centerX - radius).toFixed(2)} ${(centerY + control).toFixed(2)} ${(centerX - radius).toFixed(2)} ${centerY.toFixed(2)} c ${(centerX - radius).toFixed(2)} ${(centerY - control).toFixed(2)} ${(centerX - control).toFixed(2)} ${(centerY - radius).toFixed(2)} ${centerX.toFixed(2)} ${(centerY - radius).toFixed(2)} c ${(centerX + control).toFixed(2)} ${(centerY - radius).toFixed(2)} ${(centerX + radius).toFixed(2)} ${(centerY - control).toFixed(2)} ${(centerX + radius).toFixed(2)} ${centerY.toFixed(2)} c h f\n`;
  if (strokeColor) {
    commands += `${strokeColor} RG ${lineWidth} w ${(centerX + radius).toFixed(2)} ${centerY.toFixed(2)} m ${(centerX + radius).toFixed(2)} ${(centerY + control).toFixed(2)} ${(centerX + control).toFixed(2)} ${(centerY + radius).toFixed(2)} ${centerX.toFixed(2)} ${(centerY + radius).toFixed(2)} c ${(centerX - control).toFixed(2)} ${(centerY + radius).toFixed(2)} ${(centerX - radius).toFixed(2)} ${(centerY + control).toFixed(2)} ${(centerX - radius).toFixed(2)} ${centerY.toFixed(2)} c ${(centerX - radius).toFixed(2)} ${(centerY - control).toFixed(2)} ${(centerX - control).toFixed(2)} ${(centerY - radius).toFixed(2)} ${centerX.toFixed(2)} ${(centerY - radius).toFixed(2)} c ${(centerX + control).toFixed(2)} ${(centerY - radius).toFixed(2)} ${(centerX + radius).toFixed(2)} ${(centerY - control).toFixed(2)} ${(centerX + radius).toFixed(2)} ${centerY.toFixed(2)} c S\n`;
  }
  return commands;
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

function drawCenteredText(text, y, size, color, pageWidth, centerX = pageWidth / 2) {
  const estimatedWidth = String(text).length * size * 0.75 * 0.5;
  return drawText(text, Math.max(0, centerX - estimatedWidth / 2), y, size, color);
}

async function createCardContent(record, photoName, cardType, side) {
  const mm = (value) => (value * 72) / 25.4;
  const width = 54;
  const height = 85.6;
  const pageWidth = mm(width);
  const innerLeft = 1.1;
  const innerWidth = 51.8;
  const innerHeight = 83.4;
  const isFaculty = cardType === "faculty";
  const name = String(record.full_name || (isFaculty ? "Faculty" : "Student")).trim();
  const identifier = getIdCardIdentifier(record, cardType);
  const typeLabel = isFaculty ? "FACULTY" : "STUDENT";
  const textBaselineFromTop = (top, fontSize) =>
    mm(height - innerLeft - top - (fontSize * 0.8 * 25.4) / 96);
  const drawTextAtTop = (text, x, top, fontSize, color) =>
    drawText(text, mm(innerLeft + x), textBaselineFromTop(top, fontSize), fontSize, color);
  const drawCenteredTextAtTop = (text, centerX, top, fontSize, color) =>
    drawCenteredText(
      text,
      textBaselineFromTop(top, fontSize),
      fontSize,
      color,
      pageWidth,
      mm(innerLeft + centerX),
    );
  let content = "q\n";
  content += drawRoundedRect(0, 0, pageWidth, mm(height), mm(4), "0.49 0.57 0.64");
  content += drawRoundedRect(
    mm(innerLeft),
    mm(innerLeft),
    mm(innerWidth),
    mm(innerHeight),
    mm(3),
    "0.93 0.96 0.97",
  );
  content += drawRoundedOutline(
    mm(innerLeft + 1.3),
    mm(innerLeft + 1.3),
    mm(innerWidth - 2.6),
    mm(innerHeight - 2.6),
    mm(2.2),
    "0.93 0.96 0.97",
    0.7,
  );

  if (side === "back") {
    // Top-right dark slate angled accent
    content += drawRect(mm(18), mm(height - 7.5), mm(36), mm(7.5), "0.10 0.13 0.17");
    // Bottom corner dark slate accents
    content += drawRect(mm(0), mm(0), mm(12), mm(4), "0.10 0.13 0.17");
    content += drawRect(mm(42), mm(0), mm(12), mm(4), "0.10 0.13 0.17");

    content += drawTextAtTop("Batch", 4.5, 11, 7.5, "0.10 0.13 0.17");
    content += drawTextAtTop(":", 22, 11, 7.5, "0.10 0.13 0.17");
    content += drawTextAtTop(
      String(record.batch_label || record.batch_name || record.academic_year_label || "2023-24").slice(0, 20),
      24,
      11,
      7.5,
      "0.10 0.13 0.17",
    );
    content += drawTextAtTop("Blood Group", 4.5, 15, 7.5, "0.10 0.13 0.17");
    content += drawTextAtTop(":", 22, 15, 7.5, "0.10 0.13 0.17");
    content += drawTextAtTop(String(record.blood_group || "AB+").slice(0, 8), 24, 15, 7.5, "0.10 0.13 0.17");
    let dob = "23/01/2006";
    if (record.date_of_birth) {
      const parsed = new Date(record.date_of_birth);
      if (!Number.isNaN(parsed.getTime())) {
        dob = `${String(parsed.getUTCDate()).padStart(2, "0")}/${String(parsed.getUTCMonth() + 1).padStart(2, "0")}/${parsed.getUTCFullYear()}`;
      }
    }
    content += drawTextAtTop("Date of Birth", 4.5, 19, 7.5, "0.10 0.13 0.17");
    content += drawTextAtTop(":", 22, 19, 7.5, "0.10 0.13 0.17");
    content += drawTextAtTop(dob, 24, 19, 7.5, "0.10 0.13 0.17");

    const address = String(record.address || record.address_line || record.permanent_address || "10/66/13 LHL Nagar\nViswasapuram,Thovalai\nKanniyakumari - 629302");
    content += drawTextAtTop("Address", 4.5, 23.5, 7.5, "0.10 0.13 0.17");
    content += drawTextAtTop(":", 22, 23.5, 7.5, "0.10 0.13 0.17");
    address.split("\n").slice(0, 4).forEach((line, index) => {
      content += drawTextAtTop(line.slice(0, 32), 24, 23.5 + index * 3.3, 7, "0.10 0.13 0.17");
    });

    content += drawTextAtTop("INSTRUCTIONS", 4.5, 40, 8.5, "0.51 0.16 0.21");
    content += drawCircle(mm(5.2), mm(height - 44.5), mm(0.6), "0.51 0.16 0.21");
    content += drawTextAtTop("This Identity Card is non-transferable.", 7, 44, 5.8, "0.10 0.13 0.17");

    content += drawCircle(mm(5.2), mm(height - 49.5), mm(0.6), "0.51 0.16 0.21");
    content += drawTextAtTop("If this ID card is lost/found kindly return", 7, 48.5, 5.8, "0.10 0.13 0.17");
    content += drawTextAtTop("to theissuing authority.", 7, 51.5, 5.8, "0.10 0.13 0.17");

    content += drawCircle(mm(5.2), mm(height - 56.5), mm(0.6), "0.51 0.16 0.21");
    content += drawTextAtTop("This card must be worn visibly by student", 7, 55.5, 5.8, "0.10 0.13 0.17");
    content += drawTextAtTop("during his or her presence in Joy University", 7, 58.5, 5.8, "0.10 0.13 0.17");
    content += drawTextAtTop("premises. It must be shown to authorized", 7, 61.5, 5.8, "0.10 0.13 0.17");
    content += drawTextAtTop("personnel as and when requested.", 7, 64.5, 5.8, "0.10 0.13 0.17");

    content += drawTextAtTop("CONTACT", 4.5, 68.5, 8.5, "0.51 0.16 0.21");
    content += drawRect(mm(4.5), mm(height - 74.2), mm(3.2), mm(2.8), "0.85 0.22 0.22");
    content += drawTextAtTop("+91 4637 - 231812", 9, 73.5, 7, "0.10 0.13 0.17");
    content += drawRect(mm(4.5), mm(height - 78.2), mm(3.2), mm(2.8), "0.85 0.22 0.22");
    content += drawTextAtTop("oor@joyuniversity.edu.in", 9, 77.5, 7, "0.10 0.13 0.17");

    // 1D Barcode across bottom
    for (let index = 0; index < 50; index += 1) {
      const barWidth = index % 5 === 0 ? 0.5 : index % 3 === 0 ? 0.35 : 0.2;
      content += drawRect(mm(3.5 + index * 0.94), mm(2.5), mm(barWidth), mm(7), "0.10 0.13 0.17");
    }
    content += "Q\n";
    return ascii(content);
  }

  // FRONT
  // Corner accents in dark slate
  content += drawRect(mm(0), mm(height - 29), mm(12), mm(11), "0.10 0.13 0.17"); // top-left
  content += drawRect(mm(43), mm(height - 8), mm(11), mm(8), "0.10 0.13 0.17"); // top-right
  content += drawRect(mm(0), mm(0), mm(12), mm(4.5), "0.10 0.13 0.17"); // bottom-left
  content += drawRect(mm(43), mm(0), mm(11), mm(4.5), "0.10 0.13 0.17"); // bottom-right

  // Stylized Joy University Logo in header
  // Red U (left)
  content += drawRect(mm(22.8), mm(height - 9.5), mm(3.8), mm(6.5), "0.74 0.15 0.18");
  // Slate right bar + inner dot
  content += drawRect(mm(27), mm(height - 9.5), mm(3.8), mm(6.5), "0.45 0.55 0.62");
  content += drawCircle(mm(25.3), mm(height - 8.5), mm(1.3), "0.89 0.93 0.95");

  // Header Title
  content += drawCenteredTextAtTop("JOY UNIVERSITY", 27, 14.5, 12, "0.20 0.25 0.30");
  // Header divider rule
  content += drawRect(mm(0.5), mm(height - 17.5), mm(width - 1), mm(0.3), "0.18 0.22 0.28");

  // Photo
  if (photoName) {
    content += `q ${mm(26)} 0 0 ${mm(29)} ${mm(14)} ${mm(height - 48)} cm /${photoName} Do Q\n`;
  } else {
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase();
    content += drawCenteredText(
      initials || (isFaculty ? "F" : "S"),
      mm(27),
      16,
      "0.10 0.13 0.17",
      pageWidth,
    );
  }
  content += drawRoundedOutline(mm(14), mm(height - 48), mm(26), mm(29), mm(3), "0.18 0.22 0.28", 0.5);

  // Student Name in rich burgundy serif
  content += drawCenteredTextAtTop(name.slice(0, 32).toUpperCase(), 27, 52.5, 8.5, "0.51 0.16 0.21");
  // Identifier / Register Number
  content += drawCenteredTextAtTop(identifier.slice(0, 30), 27, 57.5, 8.5, "0.10 0.13 0.17");
  // School / Department
  content += drawCenteredTextAtTop(
    String(isFaculty ? record.department_name || record.school_name || "Faculty" : record.school_name || record.programme_name || record.department_name || "School of Computational Intelligence").slice(0, 44),
    27,
    62.5,
    7,
    "0.10 0.13 0.17",
  );

  // Signature line and signature text
  content += drawRect(mm(20.5), mm(16.5), mm(13), mm(0.2), "0.55 0.65 0.72");
  content += drawText("Inth", mm(24), mm(17.5), 10, "0.35 0.50 0.60");
  content += drawCenteredText("Registrar", mm(11.5), 7.5, "0.10 0.13 0.17", pageWidth);
  content += drawCenteredText("ISSUING AUTHORITY", mm(7.5), 5.5, "0.10 0.13 0.17", pageWidth);
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
  const batch = escapeHtml(record.batch_label || record.batch_name || record.academic_year_label || "—");
  const bloodGroup = escapeHtml(record.blood_group || "—");
  let dateOfBirth = "—";
  if (record.date_of_birth) {
    const dob = new Date(record.date_of_birth);
    if (!Number.isNaN(dob.getTime())) {
      dateOfBirth = `${String(dob.getUTCDate()).padStart(2, "0")}/${String(dob.getUTCMonth() + 1).padStart(2, "0")}/${dob.getUTCFullYear()}`;
    }
  }
  const address = escapeHtml(
    record.address || record.address_line || record.permanent_address || "Not provided",
  ).replace(/\n/g, "<br>");
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
      <div class="accent-tl"></div>
      <div class="accent-tr"></div>
      <div class="accent-bl"></div>
      <div class="accent-br"></div>
      <header class="front-header">
        <svg class="ju-mark" viewBox="0 0 40 34" fill="none">
          <path d="M6 2 h11 v18 c0 6 -4 10 -9.5 10 C3.5 30 2 27 2 21 V2 Z" fill="#9e2a37" />
          <path d="M17 2 h15 v18 c0 7 -5 11 -11 11 c-3 0 -5.5 -1 -7.5 -3 c3 -2 4.5 -5 4.5 -9 V2 Z" fill="#607686" />
          <circle cx="17.5" cy="19.5" r="5.2" fill="#edf4f6" />
        </svg>
        <strong class="ju-title">JOY UNIVERSITY</strong>
      </header>
      <div class="header-divider"></div>
      ${photo}
      <h2 class="name">${name}</h2>
      <p class="register">${escapeHtml(identifier)}</p>
      <p class="school-name">${escapeHtml(isFaculty ? record.department_name || record.school_name || "Faculty" : record.school_name || record.department_name || record.programme_name || "School of Computational Intelligence")}</p>
      <div class="sig-container">
        <svg class="sig-svg" viewBox="0 0 100 35" fill="none" stroke="#4a6572" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 28 C18 10, 26 2, 28 8 C30 18, 22 28, 38 22 C46 17, 48 9, 52 14 C56 22, 60 26, 68 20 C74 15, 78 22, 86 18 M20 23 L88 23" />
        </svg>
      </div>
      <strong class="registrar">Registrar</strong>
      <small class="issuing">ISSUING AUTHORITY</small>
    </div></article>`;
  const back = `<article class="card back"><div class="inner">
      <div class="accent-back-tr"></div>
      <div class="accent-bl"></div>
      <div class="accent-br"></div>
      <section class="back-details">
        <p><span>Batch</span><b>:</b><strong>${batch}</strong></p>
        <p><span>Blood Group</span><b>:</b><strong>${bloodGroup}</strong></p>
        <p><span>Date of Birth</span><b>:</b><strong>${dateOfBirth}</strong></p>
        <p class="address"><span>Address</span><b>:</b><strong>${address}</strong></p>
      </section>
      <h3 class="instructions-title">INSTRUCTIONS</h3>
      <ul class="instructions">
        <li>This Identity Card is non-transferable.</li>
        <li>If this ID card is lost/found kindly return to theissuing authority.</li>
        <li>This card must be worn visibly by studentduring his or her presence in Joy University premises. It must be shown to authorizedpersonnel as and when requested.</li>
      </ul>
      <section class="contact">
        <h3>CONTACT</h3>
        <p class="contact-row"><span class="badge-icon">📞</span><strong>+91 4637 - 231812</strong></p>
        <p class="contact-row"><span class="badge-icon">✉</span><strong>oor@joyuniversity.edu.in</strong></p>
      </section>
      <footer class="barcode"></footer>
    </div></article>`;
  const title = idCardFilename(identifier, cardType).replace(/\.pdf$/i, "");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: 54mm 85.6mm; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #172033; }
      html, body, .card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .card { position: relative; width: 54mm; height: 85.6mm; margin: 0; overflow: hidden; border-radius: 3.5mm; background: #edf4f6; }
      .inner { position: relative; width: 100%; height: 100%; overflow: hidden; background: #edf4f6; color: #1a202c; font-family: 'Times New Roman', Georgia, serif; }
      .accent-tl { position: absolute; z-index: 2; left: 0; top: 16mm; width: 12mm; height: 8.5mm; background: #1a202c; clip-path: polygon(0 0, 100% 0, 0 100%); }
      .accent-tr { position: absolute; z-index: 2; right: 0; top: 0; width: 11mm; height: 7mm; background: #1a202c; clip-path: polygon(100% 0, 0 0, 100% 100%); }
      .accent-bl { position: absolute; z-index: 2; left: 0; bottom: 0; width: 11mm; height: 6.5mm; background: #1a202c; clip-path: polygon(0 0, 0 100%, 100% 100%); }
      .accent-br { position: absolute; z-index: 2; right: 0; bottom: 0; width: 11mm; height: 6.5mm; background: #1a202c; clip-path: polygon(100% 0, 0 100%, 100% 100%); }
      .accent-back-tr { position: absolute; z-index: 2; right: 0; top: 0; width: 26mm; height: 6mm; background: #1a202c; clip-path: polygon(28% 0, 100% 0, 72% 100%, 0% 100%); }
      .front-header { position: absolute; z-index: 4; top: 2.5mm; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .ju-mark { width: 8.5mm; height: 7.2mm; }
      .ju-title { margin-top: 0.3mm; font-size: 7.5pt; line-height: 1; font-weight: 400; color: #2d3748; letter-spacing: 0.12em; }
      .header-divider { position: absolute; z-index: 3; top: 17.5mm; left: 3mm; right: 3mm; border-bottom: 0.6px solid rgba(45,55,72,0.7); }
      .photo { position: absolute; z-index: 5; top: 19.5mm; left: 50%; transform: translateX(-50%); width: 23.5mm; height: 27mm; border: .6px solid #2d3748; border-radius: 3mm; object-fit: cover; background: #ffffff; }
      .photo.missing { display: grid; place-items: center; color: #2d3748; font-size: 18pt; font-weight: bold; }
      .name { position: absolute; z-index: 5; top: 49.5mm; right: 2mm; left: 2mm; margin: 0; overflow: hidden; text-align: center; color: #822a36; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
      .register { position: absolute; z-index: 5; top: 54.5mm; right: 2mm; left: 2mm; margin: 0; text-align: center; font-size: 7.5pt; font-weight: 700; color: #1a202c; letter-spacing: 0.05em; }
      .school-name { position: absolute; z-index: 5; top: 59.5mm; right: 1.5mm; left: 1.5mm; margin: 0; text-align: center; font-size: 6pt; font-weight: 700; line-height: 1.1; color: #1a202c; }
      .sig-container { position: absolute; z-index: 5; bottom: 8.5mm; left: 0; right: 0; display: flex; justify-content: center; }
      .sig-svg { width: 22mm; height: 6.5mm; }
      .registrar { position: absolute; z-index: 5; bottom: 5.5mm; left: 0; right: 0; text-align: center; font-size: 6pt; font-weight: 700; color: #1a202c; }
      .issuing { position: absolute; z-index: 5; bottom: 2.5mm; left: 0; right: 0; text-align: center; font-size: 5pt; font-weight: 400; text-transform: uppercase; letter-spacing: 0.1em; color: #2d3748; }
      .back-details { position: absolute; z-index: 4; top: 7.5mm; right: 3mm; left: 3.5mm; font-size: 6.8pt; line-height: 1.25; color: #1a202c; }
      .back-details p { display: flex; margin: 0 0 1.5mm; }
      .back-details p > span { width: 18mm; font-weight: normal; }
      .back-details p > b { width: 3mm; font-weight: bold; }
      .back-details p > strong { flex: 1; font-weight: bold; }
      .back-details .address strong { font-size: 6.2pt; line-height: 1.15; }
      .instructions-title { position: absolute; z-index: 4; top: 37.5mm; left: 3.5mm; margin: 0; color: #822a36; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .instructions { position: absolute; z-index: 4; top: 41mm; right: 3mm; left: 3.5mm; margin: 0; padding: 0; list-style: none; }
      .instructions li { position: relative; margin: 0 0 1.4mm; padding-left: 2.5mm; font-size: 5.2pt; line-height: 1.2; color: #1a202c; }
      .instructions li::before { position: absolute; left: 0; top: 1mm; width: 1.1mm; height: 1.1mm; border-radius: 50%; background: #822a36; content: ""; }
      .contact { position: absolute; z-index: 4; bottom: 11.5mm; left: 3.5mm; right: 3mm; }
      .contact h3 { margin: 0; color: #822a36; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .contact-row { display: flex; align-items: center; gap: 1.8mm; margin: 1mm 0 0; font-size: 6pt; font-weight: 700; color: #1a202c; }
      .badge-icon { display: flex; width: 3.2mm; height: 3.2mm; align-items: center; justify-content: center; border-radius: 0.5mm; background: #9e2a37; color: #ffffff; font-size: 4.5pt; }
      .barcode { position: absolute; z-index: 4; right: 1.5mm; bottom: 1mm; left: 1.5mm; height: 8mm; background: repeating-linear-gradient(90deg, #1a202c 0, #1a202c 0.55mm, transparent 0.55mm, transparent 0.95mm, #1a202c 0.95mm, #1a202c 1.6mm, transparent 1.6mm, transparent 2.1mm, #1a202c 2.1mm, #1a202c 2.45mm, transparent 2.45mm, transparent 3.1mm); }
      @media screen { body { width: 54mm; margin: 16px auto; } .card { margin-bottom: 16px; box-shadow: 0 4px 20px #14532d33; } }
      @media print { .card:not(:last-child) { break-after: page; page-break-after: always; } }
    </style></head><body>${front}${back}<script>window.onload = () => setTimeout(() => window.print(), 300);</script></body></html>`);
  printWindow.document.close();
}
