"use client";
import { useMemo, useState } from "react";

export default function Home() {
  const [base, setBase] = useState({
    MONTH: "",
    DAY: "",
    YEAR: "",
    FROMTITLE: "",
    FROMCOMMAND: "",
    TOTITLE: "",
    TOCOMMAND: "",
    SUBJECT: "",
    INFO_TYPE: "",
    SIGNAME: "",
    RANK: "",
    EMAIL_TO: "",

    // REPORT UNDER (header) feature
    INCLUDE_REPORT_UNDER: false,
    REPORT_NUMBERS_TEXT: "",
  });

  const INFO_TYPE_OPTIONS = ["INFORMATION", "CONSIDERATION", "REVIEW", "APPROVAL"];

  const payload = useMemo(() => {
    const out: Record<string, string> = {};

    for (const [k, v] of Object.entries(base)) {
      if (k === "EMAIL_TO") continue; // UI-only
      if (k === "INCLUDE_REPORT_UNDER") continue; // UI-only
      if (k === "REPORT_NUMBERS_TEXT") continue; // UI-only
      out[k] = String(v ?? "");
    }

    const cleanedReports = (base.REPORT_NUMBERS_TEXT || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n");

    // These must match placeholders in the WORD HEADER:
    // Line 1 (underlined in Word): {{REPORT_UNDER_TITLE}}
    // Line 2+ (normal):           {{REPORT_NUMBERS}}
    if (base.INCLUDE_REPORT_UNDER && cleanedReports.length > 0) {
      out.REPORT_UNDER_TITLE = "REPORT UNDER";
      out.REPORT_NUMBERS = cleanedReports;
    } else {
      // When unchecked (or empty), both disappear
      out.REPORT_UNDER_TITLE = "";
      out.REPORT_NUMBERS = "";
    }

    return out;
  }, [base]);

  const download = async () => {
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

    const a = document.createElement("a");
    a.href = url;
    a.download = `memo_${(payload.SIGNAME || "draft").replace(/\s+/g, "_")}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  const emailDraft = () => {
    const to = (base.EMAIL_TO || "").trim();
    const subject = encodeURIComponent(base.SUBJECT ? `Memo: ${base.SUBJECT}` : "Memo");

    const body = encodeURIComponent(
      `Attached is the generated memo.\n\n` +
        `From: ${base.FROMTITLE || ""}${base.FROMCOMMAND ? `, ${base.FROMCOMMAND}` : ""}\n` +
        `To: ${base.TOTITLE || ""}${base.TOCOMMAND ? `, ${base.TOCOMMAND}` : ""}\n` +
        `Date: ${base.MONTH || ""} ${base.DAY || ""}, ${base.YEAR || ""}\n` +
        `Subject: ${base.SUBJECT || ""}\n\n` +
        `Tip: Download the memo first, then attach the .docx from Files/Downloads.`
    );

    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  };

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 32, marginBottom: 6 }}>Memo Generator</h1>
      <p style={{ marginBottom: 18 }}>Fill the fields and download your memo as a Word document.</p>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Date</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="Month"
            placeholder="e.g., December"
            value={base.MONTH}
            onChange={(v) => setBase({ ...base, MONTH: v })}
          />
          <Field
            label="Day"
            placeholder="e.g., 30"
            value={base.DAY}
            onChange={(v) => setBase({ ...base, DAY: v })}
          />
          <Field
            label="Year"
            placeholder="e.g., 2025"
            value={base.YEAR}
            onChange={(v) => setBase({ ...base, YEAR: v })}
          />
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>From</h2>
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
        <h2 style={{ marginTop: 0 }}>To</h2>
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
        <h2 style={{ marginTop: 0 }}>Memo</h2>

        <Field
          label="Subject"
          placeholder="What is the subject?"
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
              onChange={(e) =>
                setBase({ ...base, INCLUDE_REPORT_UNDER: e.target.checked })
              }
            />
            Add “REPORT UNDER” header
          </label>
        </div>

        {base.INCLUDE_REPORT_UNDER && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Report numbers (one per line)</label>
            <textarea
              value={base.REPORT_NUMBERS_TEXT}
              placeholder={`e.g.\nPA #14-53-332\nCOTR #454`}
              onChange={(e) =>
                setBase({ ...base, REPORT_NUMBERS_TEXT: e.target.value })
              }
              style={{ width: "100%", padding: 10, fontSize: 16, minHeight: 110 }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="Sign Name"
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

        <Field
          label="Email to (optional)"
          placeholder="yourname@email.com"
          value={base.EMAIL_TO}
          onChange={(v) => setBase({ ...base, EMAIL_TO: v })}
        />
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={download} style={{ padding: "10px 14px", fontSize: 16 }}>
          Download Word Memo
        </button>

        <button onClick={emailDraft} style={{ padding: "10px 14px", fontSize: 16 }}>
          Email Draft
        </button>
      </div>

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
        <div>© {new Date().getFullYear()} Memo Generator</div>
        <div>Internal Use Only</div>
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
