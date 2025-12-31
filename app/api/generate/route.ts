import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toStringValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "string") return v;
  // If someone accidentally sends objects/arrays, stringify safely
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

function normalizeData(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input || {})) {
    out[k] = toStringValue(v);
  }

  // Make sure the conditional flag ALWAYS exists (no undefined => no weird rendering)
  // Accepts: "true", true, 1, "1" as enabled.
  const raw = out.SHOW_REPORT_UNDER?.toLowerCase();
  const enabled = raw === "true" || raw === "1" || raw === "yes";
  out.SHOW_REPORT_UNDER = enabled ? "true" : "";

  // If condition is off, hard-clear header vars too (prevents leftover text)
  if (!enabled) {
    out.REPORT_UNDER_TITLE = "";
    out.REPORT_NUMBERS = "";
  }

  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const data = normalizeData(body);

    const templatePath = path.join(process.cwd(), "templates", "template.docx");
    const content = await fs.readFile(templatePath);

    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // Prevent "undefined" ever appearing in the doc
      nullGetter: () => "",
    });

    doc.setData(data);

    doc.render();

    const buf: Buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // Optional: allow client to name it; otherwise default
    const filename =
      (data.FILE_NAME && data.FILE_NAME.trim()) ||
      `memo_${(data.SIGNAME || "draft").trim().replace(/\s+/g, "_")}`;

    const safeName = filename
      .replace(/[\/\\?%*:|"<>]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80);

    const finalName = safeName.toLowerCase().endsWith(".docx") ? safeName : `${safeName}.docx`;

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${finalName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    // Docxtemplater throws helpful error structures; return them cleanly
    const details = err?.properties
      ? {
          id: err.properties.id,
          explanation: err.properties.explanation,
          // errors array can be large; include if present
          errors: err.properties.errors,
        }
      : undefined;

    return new Response(
      JSON.stringify({
        error: "Failed to generate document",
        message: err?.message || String(err),
        details,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
