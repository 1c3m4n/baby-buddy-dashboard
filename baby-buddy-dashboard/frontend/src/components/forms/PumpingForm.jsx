import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiDatetime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Enter valid start and end times.");
  return date.toISOString();
}

export default function PumpingForm({ childId, timerId, entry, onDone, onClose }) {
  const units = useUnits();
  const isEdit = !!entry;
  const now = new Date();
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const [amount, setAmount] = useState(entry?.amount != null ? String(entry.amount) : "");
  const [start, setStart] = useState(entry?.start ? toLocalDatetime(new Date(entry.start)) : toLocalDatetime(fifteenMinsAgo));
  const [end, setEnd] = useState(entry?.end ? toLocalDatetime(new Date(entry.end)) : toLocalDatetime(now));
  const [notes, setNotes] = useState(entry?.notes || "");
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
      const data = { amount: parseFloat(amount) };
      if (notes.trim()) data.notes = notes.trim();
      if (isEdit) {
        data.start = toApiDatetime(start);
        data.end = toApiDatetime(end);
        await api.updatePumping(entry.id, data);
      } else {
        data.child = childId;
        if (timerId) data.timer = timerId;
        else {
          data.start = toApiDatetime(start);
          data.end = toApiDatetime(end);
        }
        await api.createPumping(data);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save pumping. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Pumping" : "Log Pumping"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {!isEdit && timerId ? <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>The timer's start and end times will be used for this pumping entry.</p> : null}
        <FormField label={`Amount (${units.volume})`}>
          <FormInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="5" required />
        </FormField>
        {(isEdit || !timerId) && <>
          <FormField label="Start"><FormInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required /></FormField>
          <FormField label="End"><FormInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required /></FormField>
        </>}
        <FormField label="Notes"><FormInput type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></FormField>
        {error && <p role="alert" style={{ color: "var(--danger, #d14343)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <FormButton color={colors.pumping} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update Pumping" : "Save Pumping"}</FormButton>
      </form>
    </Modal>
  );
}
