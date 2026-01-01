// app/api/generate/route.ts
import { NextRequest } from "next/server";
import path from "path";
import { promises as fs } from "fs";

// Docxtemplater stack
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export const runtime = "nodejs";

type Payload = Record<string, any>;

function sanitizeFileName(name: string) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "49.docx";
  const safe = trimmed
    .replace(/[\/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return safe.toLowerCase().endsWith(".docx") ? safe : `${safe}.docx`;
}

async function readTemplateBuffer(): Promise<Buffer> {
  // Try common locations (you only need ONE of these to exist)
  const candidates = [
    path.join(process.cwd(), "app", "api", "generate", "template.docx"),
    path.join(process.cwd(), "public", "template.docx"),
    path.join(process.cwd(), "template.docx"),
  ];

  for (const p of candidates) {
    try {
      return await fs.readFile(p);
    } catch {
      // keep trying
    }
  }

  throw new Error(
    "Template .docx not found. Put template.docx in /public OR in /app/api/generate/ OR project root."
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as Payload;

    // ----- Normalize / enforce types -----
    // Your UI already uppercases SUBJECT in the payload, but this makes it bulletproof.
    if (typeof data.SUBJECT === "string") data.SUBJECT = data.SUBJECT.toUpperCase();

    // IMPORTANT: SHOW_REPORT_UNDER must be boolean for docxtemplater section tags
    // Your UI should send true/false. But in case it sends "1"/"" we normalize it.
    const show =
      data.SHOW_REPORT_UNDER === true ||
      data.SHOW_REPORT_UNDER === "1" ||
      data.SHOW_REPORT_UNDER === 1;

    data.SHOW_REPORT_UNDER = show;

    // Ensure these exist so template doesn't see "undefined"
    if (!show) {
      data.REPORT_UNDER_TITLE = "";
      data.REPORT_NUMBERS = "";
    } else {
      // If enabled, make sure strings exist
      data.REPORT_UNDER_TITLE = String(data.REPORT_UNDER_TITLE ?? "REPORT UNDER");
      data.REPORT_NUMBERS = String(data.REPORT_NUMBERS ?? "");
    }

    // Optional: allow server-side filename if you ever pass it
    const finalName = sanitizeFileName(String(data.FILE_NAME ?? "49"));

    // Remove any fields you never want to touch template
    delete data.FILE_NAME;

    // ----- Load template -----
    const templateBuf = await readTemplateBuffer();
    const zip = new PizZip(templateBuf);

    // Use {{ }} delimiters because your Word doc uses {{REPORT_NUMBERS}} etc.
    const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
});


    doc.setData(data);

    try {
      doc.render();
    } catch (err: any) {
      // Return useful error (this is what you saw as “Unopened tag”)
      const e = err;
      return Response.json(
        {
          error: "Template parse failed",
          detail: e?.message ?? "Unknown error",
          errors: e?.properties?.errors ?? [],
        },
        { status: 400 }
      );
    }

    const outZip = doc.getZip();
    const buf: Buffer = outZip.generate({ type: "nodebuffer" });

    // ✅ Fix: Web Response body needs Uint8Array / ArrayBuffer, not Node Buffer (TypeScript)
    const body = new Uint8Array(buf);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${finalName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return Response.json(
      {
        error: "Server error",
        detail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
