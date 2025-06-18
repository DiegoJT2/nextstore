import React, { useEffect, useRef } from "react";

function ModalContent({ mensaje, onCancel, onConfirm, cerrar }) {
  return (
    <>
      <h3 id="modal-title" className="text-lg font-bold mb-4 text-red-600">Confirmar acción</h3>
      <p id="modal-desc" className="mb-6">{mensaje || "¿Estás seguro de que deseas eliminar este producto del carrito?"}</p>
      <div className="flex gap-2 justify-end">
        <button
          className="btn-modal-cancel"
          onClick={onCancel}
          autoFocus
          type="button"
        >
          Cancelar
        </button>
        <button
          className="btn-modal-confirm"
          onClick={onConfirm}
          type="button"
        >
          {cerrar ? "Cerrar" : "Eliminar"}
        </button>
      </div>
    </>
  );
}

export default function ConfirmModal({ open, onConfirm, onCancel, mensaje, cerrar = false }) {
  const modalRef = useRef(null);

  // El hook useEffect debe estar siempre en el mismo orden, fuera de condicionales
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  // Cierra al hacer click fuera del modal
  function handleBackdrop(e) {
    if (modalRef.current && e.target === modalRef.current) {
      onCancel();
    }
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
      aria-describedby="modal-desc"
      ref={modalRef}
      onMouseDown={handleBackdrop}
    >
      <div
        className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg max-w-sm w-full m-4"
        onMouseDown={e => e.stopPropagation()}
      >
        <ModalContent mensaje={mensaje} onCancel={onCancel} onConfirm={onConfirm} cerrar={cerrar} />
      </div>
    </div>
  );
}