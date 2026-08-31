import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";
import { parseDecimalInput } from "../../utils/decimalInput";

function toLocalDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function WeightForm({ childId, entry, onDone, onClose }) {
  const units = useUnits();
  const isEdit = !!entry;
  const [weight, setWeight] = useState(entry?.weight ? String(entry.weight) : "");
  const [date, setDate] = useState(entry?.date ? toLocalDate(entry.date) : toLocalDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!weight) return;
    const parsedWeight = parseDecimalInput(weight);
    if (Number.isNaN(parsedWeight)) { setError("Enter a valid weight."); return; }
    setError("");
    setSaving(true);
    try {
      const data = { weight: parsedWeight, date };
      if (isEdit) await api.updateWeight(entry.id, data);
      else { data.child = childId; await api.createWeight(data); }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save weight. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Weight" : "Log Weight"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={`Weight (${units.weight})`}><FormInput type="text" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="5.0 or 5,0" pattern="[0-9]+([.,][0-9]+)?" autoFocus required /></FormField>
        <FormField label="Date"><FormInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></FormField>
        {error && <p role="alert" style={{ color: "var(--danger, #d14343)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <FormButton color={colors.growth} disabled={saving || !weight}>{saving ? "Saving..." : isEdit ? "Update Weight" : "Save Weight"}</FormButton>
      </form>
    </Modal>
  );
}
