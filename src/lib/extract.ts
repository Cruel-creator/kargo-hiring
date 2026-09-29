/**
 * CV text extraction. Runs locally on the server — the raw CV (with PII) is never
 * sent to Gemini. Supported: PDF (text layer), DOCX, TXT.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MIN_TEXT_CHARS = 150;

export type CvFileKind = "pdf" | "docx" | "txt";

export class FileValidationError extends Error {}
export class ExtractionError extends Error {}

const MIME: Record<CvFileKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

export function mimeFor(kind: CvFileKind) {
  return MIME[kind];
}

/** Validates by extension AND file signature; the browser-supplied MIME type is not trusted. */
export function detectFileKind(fileName: string, bytes: Uint8Array): CvFileKind {
  if (bytes.byteLength === 0) throw new FileValidationError("The file is empty.");
  if (bytes.byteLength > MAX_FILE_BYTES) throw new FileValidationError("The file is larger than 5 MB.");
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const startsWith = (sig: number[]) => sig.every((b, i) => bytes[i] === b);

  if (ext === "pdf") {
    if (!startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) throw new FileValidationError("This file is named .pdf but is not a valid PDF.");
    return "pdf";
  }
  if (ext === "docx") {
    if (!startsWith([0x50, 0x4b, 0x03, 0x04])) throw new FileValidationError("This file is named .docx but is not a valid Word document.");
    return "docx";
  }
  if (ext === "txt") {
    if (bytes.includes(0)) throw new FileValidationError("This .txt file contains binary data.");
    return "txt";
  }
  if (ext === "doc") throw new FileValidationError("Legacy .doc files are not supported. Save the CV as PDF or DOCX.");
  throw new FileValidationError("Unsupported file type. Upload a PDF, DOCX or TXT CV.");
}

export async function extractText(kind: CvFileKind, bytes: Uint8Array): Promise<string> {
  let text: string;
  try {
    if (kind === "pdf") {
      const { getDocumentProxy, extractText: pdfText } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const out = await pdfText(pdf, { mergePages: false });
      text = (Array.isArray(out.text) ? out.text : [out.text]).join("\n\n");
    } else if (kind === "docx") {
      const mammoth = await import("mammoth");
      const out = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = out.value;
    } else {
      text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
  } catch {
    throw new ExtractionError("The document could not be read. It may be corrupted, encrypted or password-protected.");
  }
  text = normaliseText(text);
  if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) {
    throw new ExtractionError("Almost no text could be read. The CV may be a scanned image; upload a text-based PDF or DOCX.");
  }
  return text;
}

export function normaliseText(t: string): string {
  return t
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[​-‍﻿]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
