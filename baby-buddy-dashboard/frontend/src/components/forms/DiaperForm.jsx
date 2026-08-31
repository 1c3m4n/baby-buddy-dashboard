import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormSelect, FormInput, FormButton } from "../Modal";
import { colors } from "../../utils/colors";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function toApiDatetime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid time.");
  return date.toISOString();
}
const COLORS = [
  { value: "", label: "Not specified" }, { value: "black", label: "Black" },
  { value: "brown", label: "Brown" }, { value: "green", label: "Green" }, { value: "yellow", label: "Yellow" },
];

export default function DiaperForm({ childId, entry, onDone, onClose, preset }) {
  const isEdit = !!entry;
  const [time, setTime] = useState(entry?.time ? toLocalDatetime(new Date(entry.time)) : toLocalDatetime(new Date()));
  const [wet, setWet] = useState(entry ? entry.wet : (preset === "wet" || preset === "both"));
  const [solid, setSolid] = useState(entry ? entry.solid : (preset === "solid" || preset === "both"));
  const [color, setColor] = useState(entry?.color || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = { wet, solid, time: toApiDatetime(time) };
      if (color) data.color = color;
      if (notes.trim()) data.notes = notes.trim();
      if (isEdit) await api.updateChange(entry.id, data);
      else { data.child = childId; await api.createChange(data); }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save diaper change. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Diaper Change" : "Log Diaper Change"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Time"><FormInput type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} required /></FormField>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {[{ key: "wet", label: "Wet", active: wet, toggle: () => setWet(!wet) }, { key: "solid", label: "Solid", active: solid, toggle: () => setSolid(!solid) }].map((btn) => <button key={btn.key} type="button" onClick={btn.toggle} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: btn.active ? `2px solid ${colors.diaper}` : "1px solid var(--border)", background: btn.active ? `${colors.diaper}15` : "var(--bg)", color: btn.active ? colors.diaper : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{btn.label}</button>)}
        </div>
        {solid && <FormField label="Color"><FormSelect options={COLORS} value={color} onChange={(e) => setColor(e.target.value)} /></FormField>}
        <FormField label="Notes"><FormInput type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></FormField>
        {error && <p role="alert" style={{ color: "var(--danger, #d14343)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <FormButton color={colors.diaper} disabled={saving || (!wet && !solid)}>{saving ? "Saving..." : isEdit ? "Update Change" : "Save Change"}</FormButton>
      </form>
    </Modal>
  );
}
