import { useState } from "react";

export default function useConfirmAction() {
  const [state, setState] = useState({ open: false, titulo: '', mensaje: '', onConfirm: null });
  const showConfirm = (titulo, mensaje, onConfirm) => {
    setState({ open: true, titulo, mensaje, onConfirm });
  };
  const handleConfirm = () => {
    if (state.onConfirm) state.onConfirm();
    setState({ ...state, open: false });
  };
  const handleCancel = () => setState({ ...state, open: false });
  return {
    confirmState: state,
    showConfirm,
    handleConfirm,
    handleCancel,
  };
}