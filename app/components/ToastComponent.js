import React from "react";

export default function ToastComponent({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-white transition-all duration-300 ${
        toast.type === "error" ? "bg-red-500" : "bg-green-500"
      }`}
      role="alert"
      aria-live="polite"
    >
      {toast.msg}
    </div>
  );
}