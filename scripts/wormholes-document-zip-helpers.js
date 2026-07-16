/* GENERATED from scripts/modules/document-zip-helpers.mjs. Do not edit this direct-file compatibility adapter. */
/* Wormholes Beta 249 document, DOCX, and ZIP helpers.
   Canonical ES-module source. The direct-file build receives a generated
   classic compatibility adapter so downloaded file:// use remains supported. */

function extractBodyFromSavedHtml(text) {
  const match = String(text || "").match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : text;
}

function htmlToPlainText(htmlText) {
  const tmp = document.createElement("div");
  const sanitizer = globalThis.sanitizeLiteratureHtml;
  if (typeof sanitizer !== "function") throw new Error("Literature sanitizer is not available.");
  tmp.innerHTML = sanitizer(htmlText || "");
  tmp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  tmp.querySelectorAll("p, div, h1, h2, h3, h4, li").forEach((block) => {
    block.appendChild(document.createTextNode("\n"));
  });
  return (tmp.textContent || tmp.innerText || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function plainTextToFolderText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}
/* Literature module: moved literatureContentToFolderText() to scripts/literature.js. */

/* Literature module: moved folderTextToLiteratureContent() to scripts/literature.js. */

/* Literature module: moved sourceLiteratureTextToFolderText() to scripts/literature.js. */

/* Literature module: moved sourceLiteratureTextToAppContent() to scripts/literature.js. */

function xmlEscape(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textToDocxParagraphXml(text) {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  if (!lines.length) lines.push("");

  return lines
    .map((line) => {
      const safe = xmlEscape(line || "");
      return `<w:p><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`;
    })
    .join("");
}

function docxImageParagraphXml(image, index) {
  const relId = image.relId || `rId${index + 2}`;
  const title = xmlEscape(image.title || `Linked image ${index + 1}`);
  const cx = Math.max(320000, Math.round(image.cx || 1463040));
  const cy = Math.max(320000, Math.round(image.cy || 1463040));
  const docPrId = index + 1;

  return `
    <w:p>
      <w:r>
        <w:t xml:space="preserve">${title}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="${cx}" cy="${cy}"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="${docPrId}" name="${title}" descr="${title}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="${docPrId}" name="${title}"/>
                    <pic:cNvPicPr>
                      <a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
                    </pic:cNvPicPr>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${relId}"/>
                    <a:srcRect/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${cx}" cy="${cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
  `;
}

function createDocxDocumentXml(text, images = []) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${textToDocxParagraphXml(text)}
    ${images.map((image, index) => docxImageParagraphXml(image, index)).join("")}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

let crc32Table = null;

function getCrc32Table() {
  if (crc32Table) return crc32Table;

  crc32Table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc32Table[n] = c >>> 0;
  }

  return crc32Table;
}

function crc32(bytes) {
  const table = getCrc32Table();
  let crc = 0xffffffff;

  for (let i = 0; i < bytes.length; i += 1) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function uint16Bytes(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function uint32Bytes(value) {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concatUint8Arrays(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;

  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });

  return out;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return {dosTime, dosDate};
}

function createZipBlob(files, mimeType = "application/zip") {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const {dosTime, dosDate} = dosDateTime();

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = typeof file.data === "string" ? encoder.encode(file.data) : file.data;
    const checksum = crc32(dataBytes);

    const localHeader = concatUint8Arrays([
      uint32Bytes(0x04034b50),
      uint16Bytes(20),
      uint16Bytes(0x0800),
      uint16Bytes(0),
      uint16Bytes(dosTime),
      uint16Bytes(dosDate),
      uint32Bytes(checksum),
      uint32Bytes(dataBytes.length),
      uint32Bytes(dataBytes.length),
      uint16Bytes(nameBytes.length),
      uint16Bytes(0),
      nameBytes,
    ]);

    localParts.push(localHeader, dataBytes);

    const centralHeader = concatUint8Arrays([
      uint32Bytes(0x02014b50),
      uint16Bytes(20),
      uint16Bytes(20),
      uint16Bytes(0x0800),
      uint16Bytes(0),
      uint16Bytes(dosTime),
      uint16Bytes(dosDate),
      uint32Bytes(checksum),
      uint32Bytes(dataBytes.length),
      uint32Bytes(dataBytes.length),
      uint16Bytes(nameBytes.length),
      uint16Bytes(0),
      uint16Bytes(0),
      uint16Bytes(0),
      uint16Bytes(0),
      uint32Bytes(0),
      uint32Bytes(offset),
      nameBytes,
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  });

  const centralDirectory = concatUint8Arrays(centralParts);
  const endRecord = concatUint8Arrays([
    uint32Bytes(0x06054b50),
    uint16Bytes(0),
    uint16Bytes(0),
    uint16Bytes(files.length),
    uint16Bytes(files.length),
    uint32Bytes(centralDirectory.length),
    uint32Bytes(offset),
    uint16Bytes(0),
  ]);

  return new Blob([...localParts, centralDirectory, endRecord], {type: mimeType});
}

function createDocxBlobFromText(text) {
  return createDocxBlobFromTextAndImages(text, []);
}

function createDocxBlobFromTextAndImages(text, images = []) {
  const hasImages = Array.isArray(images) && images.length > 0;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${images.map((image) => `<Relationship Id="${image.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.fileName}"/>`).join("\n  ")}
</Relationships>`;

  const files = [
    {name: "[Content_Types].xml", data: contentTypes},
    {name: "_rels/.rels", data: rootRels},
    {name: "word/document.xml", data: createDocxDocumentXml(text, images)},
  ];

  if (hasImages) {
    files.push({name: "word/_rels/document.xml.rels", data: documentRels});
    images.forEach((image) => {
      files.push({name: `word/media/${image.fileName}`, data: image.data});
    });
  }

  return createZipBlob(
    files,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}
/* Literature module: moved materializeLiteratureDoc() to scripts/literature.js. */

/* Literature module: moved syncLiteratureFolderEntries() to scripts/literature.js. */

/* Literature module: moved migrateLiteratureEntriesToFolder() to scripts/literature.js. */

/* Literature module: moved getLiteratureDoc() to scripts/literature.js. */

/* Literature module: moved isLiteratureGroup() to scripts/literature.js. */

/* Literature module: moved literatureGroupChildIds() to scripts/literature.js. */

/* Literature module: moved getLiteratureGroupForDocId() to scripts/literature.js. */

/* Literature module: moved topLevelLiteratureEntries() to scripts/literature.js. */

/* Literature module: moved literatureGroupChildDocs() to scripts/literature.js. */

/* Literature module: moved normalizeLiteratureTags() to scripts/literature.js. */

/* Literature module: moved mergeLiteratureTags() to scripts/literature.js. */

/* Literature module: moved literatureGroupTagUnion() to scripts/literature.js. */

/* Literature module: moved normalizeLiteratureGroups() to scripts/literature.js. */

/* Literature module: moved literaturePlainPreview() to scripts/literature.js. */

/* Literature module: moved escapeLiteratureUploadText() to scripts/literature.js. */

/* Literature module: moved literatureFileKind() to scripts/literature.js. */

/* Literature module: moved literatureFileTypeLabel() to scripts/literature.js. */

function formatFileSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
/* Literature module: moved sanitizeLiteratureHtml() to scripts/literature.js. */

function decodeXmlEntities(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text || "";
  return textarea.value;
}
/* Literature module: moved plainTextToLiteratureHtml() to scripts/literature.js. */

async function inflateZipData(data, method) {
  if (method === 0) return data;
  if (method !== 8) throw new Error(`Unsupported DOCX ZIP compression method: ${method}`);

  if (!("DecompressionStream" in globalThis)) {
    throw new Error("DOCX conversion requires browser DecompressionStream support.");
  }

  const stream = new Blob([data])
    .stream()
    .pipeThrough(new globalThis.DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findZipEndOfCentralDirectory(bytes) {
  const min = Math.max(0, bytes.length - 66000);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return i;
    }
  }
  return -1;
}

function readUInt16LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUInt32LE(bytes, offset) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

async function readDocxZipEntry(arrayBuffer, wantedName) {
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder("utf-8");
  const eocd = findZipEndOfCentralDirectory(bytes);
  if (eocd < 0) throw new Error("Could not read DOCX ZIP directory.");

  const entryCount = readUInt16LE(bytes, eocd + 10);
  let offset = readUInt32LE(bytes, eocd + 16);

  for (let i = 0; i < entryCount; i++) {
    if (readUInt32LE(bytes, offset) !== 0x02014b50) break;

    const method = readUInt16LE(bytes, offset + 10);
    const compressedSize = readUInt32LE(bytes, offset + 20);
    const nameLength = readUInt16LE(bytes, offset + 28);
    const extraLength = readUInt16LE(bytes, offset + 30);
    const commentLength = readUInt16LE(bytes, offset + 32);
    const localHeaderOffset = readUInt32LE(bytes, offset + 42);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));

    if (name === wantedName) {
      const localNameLength = readUInt16LE(bytes, localHeaderOffset + 26);
      const localExtraLength = readUInt16LE(bytes, localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      const inflated = await inflateZipData(compressed, method);
      return decoder.decode(inflated);
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return "";
}

function extractTextFromDocxXml(xml) {
  if (!xml) return "";
  const paragraphs = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [xml];

  return paragraphs
    .map((paragraph) => {
      let working = paragraph
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br\/>/g, "\n")
        .replace(/<w:cr\/>/g, "\n");

      const chunks = [];
      const textRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let match;
      while ((match = textRegex.exec(working))) {
        chunks.push(decodeXmlEntities(match[1]));
      }
      return chunks.join("");
    })
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .join("\n\n");
}

async function convertDocxArrayBufferToText(arrayBuffer) {
  const documentXml = await readDocxZipEntry(arrayBuffer, "word/document.xml");
  const text = extractTextFromDocxXml(documentXml);
  return text.trim() || "No editable text could be extracted from this DOCX file.";
}

function convertDocArrayBufferToText(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const latin = new TextDecoder("latin1").decode(bytes);
  const utf16 = new TextDecoder("utf-16le").decode(bytes);
  const candidates = [];

  [latin, utf16].forEach((source) => {
    const matches = source.match(/[A-Za-z0-9][\w\s.,;:'"!?()[\]{}\-–—\/\\@#$%&*+=<>]{4,}/g) || [];
    matches.forEach((item) => {
      const cleaned = item
        .replace(/\s+/g, " ")
        .replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ž]/g, "")
        .trim();
      if (cleaned.length >= 8 && /[A-Za-z]/.test(cleaned)) candidates.push(cleaned);
    });
  });

  const seen = new Set();
  const lines = candidates.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    lines.slice(0, 400).join("\n\n") ||
    "No editable text could be extracted from this legacy DOC file."
  );
}

/* Temporary global publication for controllers that still execute as classic
   compatibility adapters in the served runtime. */
function installLegacyDocumentZipBindings(target = globalThis) {
  const bindings = {
    extractBodyFromSavedHtml,
    htmlToPlainText,
    plainTextToFolderText,
    xmlEscape,
    textToDocxParagraphXml,
    docxImageParagraphXml,
    createDocxDocumentXml,
    getCrc32Table,
    crc32,
    uint16Bytes,
    uint32Bytes,
    concatUint8Arrays,
    dosDateTime,
    createZipBlob,
    createDocxBlobFromText,
    createDocxBlobFromTextAndImages,
    formatFileSize,
    decodeXmlEntities,
    inflateZipData,
    findZipEndOfCentralDirectory,
    readUInt16LE,
    readUInt32LE,
    readDocxZipEntry,
    extractTextFromDocxXml,
    convertDocxArrayBufferToText,
    convertDocArrayBufferToText,
  };
  Object.assign(target, bindings);
  return Object.freeze({...bindings});
}

if (typeof window !== "undefined") installLegacyDocumentZipBindings(window);
