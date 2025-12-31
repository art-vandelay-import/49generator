import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export const runtime = "nodejs";

function sanitizePayload(input: any): Record<string, string> {
  // Accept a plain object of key/value pairs and coerce to strings.
  // Filter out weird keys to avoid abuse on a public endpoint.
  const out: Record<string, string> = {};

  if (!input || typeof input !== "object" || Array.isArray(input)) return out;

  for (const [rawKey, rawVal] of Object.entries(input)) {
    const key = String(rawKey).trim();

    // Allow typical placeholder keys like MONTH, FromTitle, FROM_TITLE, etc.
    if (!/^[A-Za-z0-9_]+$/.test(key)) continue;

    // Coerce value to string, limit length
    let val = rawVal == null ? "" : String(rawVal);
    if (val.length > 5000) val = val.slice(0, 5000);

    out[key] = val;
  }

  return out;
}

export async function POST(req: Request) {
  let payload: Record<string, string> = {};
  try {
    payload = sanitizePayload(await req.json());
  } catch {
    payload = {};
  }

  const templatePath = path.join(process.cwd(), "templates", "template.docx");

  if (!fs.existsSync(templatePath)) {
    return new Response(
      JSON.stringify({
        error: "Template not found",
        detail: `Expected template at: ${templatePath}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);

  let doc: any;
  try {
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // Your template uses {{PLACEHOLDER}} style
      delimiters: { start: "{{", end: "}}" },
      // Never output "undefined"
      nullGetter: () => "",
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify(
        {
          error: "Template parse failed",
          detail: e?.message,
          errors: e?.properties?.errors,
        },
        null,
        2
      ),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // This is the magic: whatever keys you send become available to the template.
  // Example: payload { MONTH: "December" } fills {{MONTH}}
  doc.setData(payload);

  try {
    doc.render();
  } catch (e: any) {
    return new Response(
      JSON.stringify(
        {
          error: "Template render failed",
          detail: e?.message,
          errors: e?.properties?.errors,
        },
        null,
        2
      ),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const buf = doc.getZip().generate({ type: "nodebuffer" });

  // Pick a filename from SIGNAME if provided, else draft
  const safeBase = (payload.SIGNAME || payload.sigName || payload.name || "draft")
    .toString()
    .replace(/[^a-z0-9_\-]+/gi, "_");

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="memo_${safeBase}.docx"`,
    },
  });
}
