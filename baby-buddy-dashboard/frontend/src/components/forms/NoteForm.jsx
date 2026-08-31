import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton } from "../Modal";
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

export default function NoteForm({ childId, entry, onDone, onClose }) {
  const isEdit = !!entry;
  const [time, setTime] = useState(entry?.time ? toLocalDatetime(new Date(entry.time)) : toLocalDatetime(new Date()));
  const [note, setNote] = useState(entry?.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setError("");
    setSaving(true);
    try {
      const data = { note: note.trim(), time: toApiDatetime(time) };
      if (isEdit) await api.updateNote(entry.id, data);
      else { data.child = childId; await api.createNote(data); }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save note. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Note" : "Add Note"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Time"><FormInput type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} required /></FormField>
        <FormField label="Note">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical" }} />
        </FormField>
        {error && <p role="alert" style={{ color: "var(--danger, #d14343)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <FormButton color={colors.note} disabled={saving || !note.trim()}>{saving ? "Saving..." : isEdit ? "Update Note" : "Save Note"}</FormButton>
      </form>
    </Modal>
  );
}
