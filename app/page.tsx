"use client";
import { useMemo, useState } from "react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CHANGELOG = [
  { date: "2025-12-31", text: "Added REPORT UNDER header option." },
  { date: "2025-12-31", text: "Single date input now formats as 'December 31, 2025'." },
  { date: "2025-12-31", text: "Custom file naming added." },
];

function sanitizeFileName(name: string) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "";
  // remove illegal filename chars + collapse spaces
  return trimmed
    .replace(/[\/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

// Accepts: 12/31/25, 12/31/2025, 1/2/25, 01-02-25, etc.
function parseUSDateToParts(
  input: string
): { monthName: string; day: string; year: string } | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (!m) return null;

  const mm = Number(m[1]);
  const dd = Number(m[2]);
  let yy = Number(m[3]);

  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  // Convert 2-digit years (simple, practical rule)
  if (m[3].length === 2) {
    // 00–79 => 2000–2079, 80–99 => 1980–1999
    yy = yy <= 79 ? 2000 + yy : 1900 + yy;
  }

  // Validate actual calendar date using JS Date
  const d = new Date(yy, mm - 1, dd);
  if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;

  return {
    monthName: MONTH_NAMES[mm - 1],
    day: String(dd),
    year: String(yy),
  };
}

export default function Home() {
  const [base, setBase] = useState({
    // file name user chooses
    FILE_NAME: "",

    // single date input like 12/31/25
    DATE_INPUT: "",

    FROMTITLE: "",
    FROMCOMMAND: "",
    TOTITLE: "",
    TOCOMMAND: "",
    SUBJECT: "",
    INFO_TYPE: "",
    SIGNAME: "",
    RANK: "",

    // REPORT UNDER (header) feature
    INCLUDE_REPORT_UNDER: false,
    REPORT_NUMBERS_TEXT: "",
  });

  const [showChangelog, setShowChangelog] = useState(false);

  const INFO_TYPE_OPTIONS = ["INFORMATION", "CONSIDERATION", "REVIEW", "APPROVAL"];

  const payload = useMemo(() => {
    const out: Record<string, string> = {};

    // Exclude UI-only fields from direct pass-through
    const EXCLUDE = new Set(["FILE_NAME", "DATE_INPUT", "INCLUDE_REPORT_UNDER", "REPORT_NUMBERS_TEXT"]);

    for (const [k, v] of Object.entries(base)) {
      if (EXCLUDE.has(k)) continue;

      if (k === "SUBJECT") {
        out[k] = String(v ?? "").toUpperCase();
      } else {
        out[k] = String(v ?? "");
      }
    }

    // DATE: derive MONTH / DAY / YEAR for your existing Word placeholders:
    // In Word body you likely have: {{MONTH}} {{DAY}}, {{YEAR}}
    const parts = parseUSDateToParts(base.DATE_INPUT);
    if (parts) {
      out.MONTH = parts.monthName;
      out.DAY = parts.day;
      out.YEAR = parts.year;
    } else {
      out.MONTH = "";
      out.DAY = "";
      out.YEAR = "";
    }

    // REPORT UNDER block (Word header placeholders):
    // {{REPORT_UNDER_TITLE}} and {{REPORT_NUMBERS}}
    const cleanedReports = (base.REPORT_NUMBERS_TEXT || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n");

    if (base.INCLUDE_REPORT_UNDER && cleanedReports.length > 0) {
      out.REPORT_UNDER_TITLE = "REPORT UNDER";
      out.REPORT_NUMBERS = cleanedReports;
    } else {
      out.REPORT_UNDER_TITLE = "";
      out.REPORT_NUMBERS = "";
    }

    return out;
  }, [base]);

  const download = async () => {
    // Enforce valid date if they typed something
    if (base.DATE_INPUT.trim() && !parseUSDateToParts(base.DATE_INPUT)) {
      alert("Please enter a valid date like 12/31/25 (MM/DD/YY).");
      return;
    }

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const chosen = sanitizeFileName(base.FILE_NAME);
    const fallback = `memo_${(payload.SIGNAME || "draft").replace(/\s+/g, "_")}`;
    const fileBase = chosen || fallback;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileBase.toLowerCase().endsWith(".docx") ? fileBase : `${fileBase}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 32, marginBottom: 6 }}>49 Generator</h1>
      <p style={{ marginBottom: 18 }}>Perfect 49's. Everytime. Fill in the Fields and Download to Word.</p>
      <p style={{ marginTop: -8, marginBottom: 18, color: "#666", fontSize: 13 }}>
        Privacy: This tool does not store or log any data you enter—your 49 is generated on the fly.
      </p>

      {/* File naming at the top */}
      <section style={cardStyle}>
        <Field
          label="File name (optional)"
          placeholder="e.g., 49__report_12-31-25"
          value={base.FILE_NAME}
          onChange={(v) => setBase({ ...base, FILE_NAME: v })}
        />
      </section>

      {/* Single date input */}
      <section style={cardStyle}>
        <Field
          label="Date (MM/DD/YY)"
          placeholder="e.g., 12/31/25"
          value={base.DATE_INPUT}
          onChange={(v) => setBase({ ...base, DATE_INPUT: v })}
        />
        <div style={{ color: "#666", fontSize: 13, marginTop: -6 }}>
          Will print as: <b>December 31, 2025</b>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="From Title"
            placeholder="What is your title?"
            value={base.FROMTITLE}
            onChange={(v) => setBase({ ...base, FROMTITLE: v })}
          />
          <Field
            label="From Command"
            placeholder="What is your command?"
            value={base.FROMCOMMAND}
            onChange={(v) => setBase({ ...base, FROMCOMMAND: v })}
          />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="To Title"
            placeholder="What is their title?"
            value={base.TOTITLE}
            onChange={(v) => setBase({ ...base, TOTITLE: v })}
          />
          <Field
            label="To Command"
            placeholder="What is their command?"
            value={base.TOCOMMAND}
            onChange={(v) => setBase({ ...base, TOCOMMAND: v })}
          />
        </div>
      </section>

      <section style={cardStyle}>
        <Field
          label="SUBJECT"
          placeholder="This will print in capital letters no matter how you type it."
          value={base.SUBJECT}
          onChange={(v) => setBase({ ...base, SUBJECT: v })}
        />

        <SelectField
          label="For your…"
          value={base.INFO_TYPE}
          onChange={(v) => setBase({ ...base, INFO_TYPE: v })}
          options={INFO_TYPE_OPTIONS}
        />

        {/* REPORT UNDER checkbox + textarea */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={base.INCLUDE_REPORT_UNDER}
              onChange={(e) => setBase({ ...base, INCLUDE_REPORT_UNDER: e.target.checked })}
            />
            Add communication numbers in header
          </label>
        </div>

        {base.INCLUDE_REPORT_UNDER && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Report numbers (one per line)</label>
            <textarea
              value={base.REPORT_NUMBERS_TEXT}
              placeholder={`e.g.\nCOD #2026-001\nPSB #454-26`}
              onChange={(e) => setBase({ ...base, REPORT_NUMBERS_TEXT: e.target.value })}
              style={{ width: "100%", padding: 10, fontSize: 16, minHeight: 110 }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="Signature Line"
            placeholder="What is your name?"
            value={base.SIGNAME}
            onChange={(v) => setBase({ ...base, SIGNAME: v })}
          />
          <Field
            label="Rank"
            placeholder="What is your rank?"
            value={base.RANK}
            onChange={(v) => setBase({ ...base, RANK: v })}
          />
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={download} style={{ padding: "10px 14px", fontSize: 16 }}>
          Download to Word
        </button>
      </div>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Changelog</h2>
          <button
            type="button"
            onClick={() => setShowChangelog((v) => !v)}
            style={{ padding: "8px 12px", fontSize: 14, cursor: "pointer" }}
          >
            {showChangelog ? "Hide" : "Show"}
          </button>
        </div>

        {showChangelog && (
          <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18, color: "#444" }}>
            {CHANGELOG.map((item) => (
              <li key={`${item.date}-${item.text}`} style={{ marginBottom: 6 }}>
                <b>{item.date}:</b> {item.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer
        style={{
          marginTop: 28,
          paddingTop: 14,
          borderTop: "1px solid #eee",
          color: "#666",
          fontSize: 13,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>© {new Date().getFullYear()} H. Bag, Inc.</div>
        <div>webmaster@49generator.com</div>
      </footer>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 16,
  border: "1px solid #ddd",
  borderRadius: 10,
  marginBottom: 18,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  paddingBottom: 6,
  marginBottom: 8,
  borderBottom: "1px solid #e5e5e5",
  fontWeight: 600,
};

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: 10, fontSize: 16 }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div style={{ marginBottom: 14, flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: 10, fontSize: 16, height: 44 }}
      >
        <option value="">— Select —</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
