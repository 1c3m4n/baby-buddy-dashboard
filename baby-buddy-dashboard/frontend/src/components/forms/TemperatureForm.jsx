import { useState } from "react";
import { api } from "../../api";
import Modal, { FormField, FormInput, FormButton } from "../Modal";
import { colors } from "../../utils/colors";
import { useUnits } from "../../utils/units";

export default function TemperatureForm({ childId, onDone, onClose }) {
  const units = useUnits();
  const [temp, setTemp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!temp) return;
    setError("");
    setSaving(true);
    try {
      await api.createTemperature({
        child: childId,
        temperature: parseFloat(temp),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save temperature. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal title="Log Temperature" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <FormField label={`Temperature (${units.temp})`}>
          <FormInput
            type="number"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="36.6"
            min="30"
            max="45"
            step="0.1"
            autoFocus
          />
        </FormField>
        {error && <p role="alert" style={{ color: "var(--danger, #d14343)", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <FormButton color={colors.temp} disabled={saving || !temp}>
          {saving ? "Saving..." : "Save Temperature"}
        </FormButton>
      </form>
    </Modal>
  );
}
