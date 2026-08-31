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
  if (Number.isNaN(date.getTime())) throw new Error("Enter valid start and end times.");
  return date.toISOString();
}

export default function TummyTimeForm({ childId, timerId, entry, onDone, onClose }) {
  const isEdit = !!entry;
  const now = new Date();
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const [milestone, setMilestone] = useState(entry?.milestone || "");
  const [start, setStart] = useState(entry?.start ? toLocalDatetime(new Date(entry.start)) : toLocalDatetime(tenMinsAgo));
  const [end, setEnd] = useState(entry?.end ? toLocalDatetime(new Date(entry.end)) : toLocalDatetime(now));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if ((isEdit || !timerId) && new Date(end) <= new Date(start)) {
      setError("End time must be after the start time.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const data = { start: toApiDatetime(start), end: toApiDatetime(end) };
        if (milestone.trim()) data.milestone = milestone.trim();
        await api.updateTummyTime(entry.id, data);
      } else {
        const data = { child: childId };
        if (timerId) data.timer = timerId;
        else {
          data.start = toApiDatetime(start);
          data.end = toApiDatetime(end);
        }
        if (milestone.trim()) data.milestone = milestone.trim();
        await api.createTummyTime(data);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save tummy time. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Tummy Time" : "Log Tummy Time"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {!isEdit && timerId ? <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>The timer's start and end times will be used for this tummy time entry.</p> : null}
        {(isEdit || !timerId) && <>
          <FormField label="Start"><FormInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></FormField>
          <FormField label="End"><FormInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required /></FormField>
        </>}
        <FormField label="Milestone (optional)"><FormInput value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="e.g., Lifted head" /></FormField>
        {error && <p role="alert" style={{ color: "var(--danger, #d14343)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <FormButton color={colors.tummy} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update Tummy Time" : "Save Tummy Time"}</FormButton>
      </form>
    </Modal>
  );
}
