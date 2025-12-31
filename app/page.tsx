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
  });

  // Only dropdown you want:
  const INFO_TYPE_OPTIONS = ["INFORMATION", "CONSIDERATION", "REVIEW", "APPROVAL"];

  const payload = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(base)) out[k] = v;
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

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 32, marginBottom: 6 }}>UF-49 Generator. Perfect 49's. Everytime.</h1>
      <p style={{ marginBottom: 18 }}>Fill the fields and download your memo as a Word document.</p>

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Date</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="Month"
            placeholder="e.g., July"
            value={base.MONTH}
            onChange={(v) => setBase({ ...base, MONTH: v })}
          />
          <Field
            label="Day"
            placeholder="e.g., 12"
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

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>FROM:</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="What is your title?"
            placeholder="e.g., Patrol Supervisor"
            value={base.FROMTITLE}
            onChange={(v) => setBase({ ...base, FROMTITLE: v })}
          />
          <Field
            label="What is your command?"
            placeholder="e.g., 9th Precinct"
            value={base.FROMCOMMAND}
            onChange={(v) => setBase({ ...base, FROMCOMMAND: v })}
          />
        </div>
      </section>

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>TO</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="Who is this going go?"
            placeholder="e.g., Commanding Officer"
            value={base.TOTITLE}
            onChange={(v) => setBase({ ...base, TOTITLE: v })}
          />
          <Field
            label="What is their command?"
            placeholder="e.g., 20th Precinct"
            value={base.TOCOMMAND}
            onChange={(v) => setBase({ ...base, TOCOMMAND: v })}
          />
        </div>
      </section>

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 10, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>BODY</h2>

        <Field
          label="SUBJECT (CAPS)"
          placeholder="e.g., SHOTS FIRED, 123 MAIN STREET"
          value={base.SUBJECT}
          onChange={(v) => setBase({ ...base, SUBJECT: v })}
        />

        {/* The ONLY dropdown */}
        <SelectField
          label="SUBMITTED FOR YOUR...?"
          value={base.INFO_TYPE}
          onChange={(v) => setBase({ ...base, INFO_TYPE: v })}
          options={INFO_TYPE_OPTIONS}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <Field
            label="What's your name?"
            placeholder="e.g., Art Vandelay"
            value={base.SIGNAME}
            onChange={(v) => setBase({ ...base, SIGNAME: v })}
          />
          <Field
            label="Rank"
            placeholder="e.g., Sergeant"
            value={base.RANK}
            onChange={(v) => setBase({ ...base, RANK: v })}
          />
        </div>
      </section>

      <button onClick={download} style={{ padding: "10px 14px", fontSize: 16 }}>
        Download Word Memo
      </button>
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
      <label style={{ display: "block", marginBottom: 6 }}>{label}</label>
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
      <label style={{ display: "block", marginBottom: 6 }}>{label}</label>
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
