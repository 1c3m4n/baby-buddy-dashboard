import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormSelect, FormButton } from "../Modal";
import { colors } from "../../utils/colors";

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DOSAGE_UNITS = [
  { value: "drops", label: "drops" },
  { value: "ml", label: "ml" },
  { value: "mg", label: "mg" },
  { value: "tablets", label: "tablets" },
];

export default function MedicationForm({ childId, entry, defaultName, onDone, onClose }) {
  const isEdit = !!entry;
  const [name, setName] = useState(entry?.name || defaultName || "Vitamin D");
  const [dosage, setDosage] = useState(entry?.dosage != null ? String(entry.dosage) : "");
  const [dosageUnit, setDosageUnit] = useState(entry?.dosage_unit || "drops");
  const [time, setTime] = useState(entry?.time ? toLocalDatetime(new Date(entry.time)) : toLocalDatetime(new Date()));
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        dosage: dosage === "" ? null : Number(dosage),
        dosage_unit: dosageUnit,
        time: `${time}:00`,
        notes: notes.trim() || null,
        tags: ["vitamins"],
      };
      if (isEdit) {
        await api.updateMedication(entry.id, data);
      } else {
        data.child = childId;
        await api.createMedication(data);
      }
      onDone();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? "Edit Vitamins" : "Log Vitamins"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label="Time">
          <FormInput
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Name">
          <FormInput
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </FormField>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Dosage">
            <FormInput
              type="number"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              min="0"
              step="0.1"
              placeholder="Optional"
            />
          </FormField>
          <FormField label="Unit">
            <FormSelect
              options={DOSAGE_UNITS}
              value={dosageUnit}
              onChange={(e) => setDosageUnit(e.target.value)}
            />
          </FormField>
        </div>
        <FormField label="Notes">
          <FormInput
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </FormField>
        <FormButton color={colors.temp} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update Vitamins" : "Save Vitamins"}
        </FormButton>
      </form>
    </Modal>
  );
}
