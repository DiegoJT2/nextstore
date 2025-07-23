import React, { useState, useEffect } from "react";

export default function TelefonoInput({ value, onSave, showToast }) {
  const [input, setInput] = useState("");

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  function formatTelefono(val) {
    val = val.replace(/\D/g, "").slice(0, 9);
    return val.replace(/(\d{3})(\d{0,3})(\d{0,3})/, (m, a, b, c) => {
      let out = a;
      if (b) out += "." + b;
      if (c) out += "." + c;
      return out;
    });
  }

  return (
    <div className="mb-2">
      <b>Teléfono (2FA):</b>
      <input
        type="tel"
        className="ml-2 p-1 rounded border border-gray-300 w-32"
        value={input}
        onChange={e => setInput(formatTelefono(e.target.value))}
        placeholder="Ej: 600.123.456"
        inputMode="numeric"
      />
      <button
        className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
        onClick={() => {
          if (!/^\d{3}\.\d{3}\.\d{3}$/.test(input)) {
            showToast && showToast("Introduce un teléfono válido (9 dígitos)", "error");
            return;
          }
          onSave(input);
          showToast && showToast("Teléfono guardado para verificación 2FA", "success");
        }}
      >Guardar</button>
    </div>
  );
}
