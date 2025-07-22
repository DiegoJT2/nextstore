import { useState, useRef, useCallback, useEffect } from "react";

export default function useToast() {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef();

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return [toast, showToast];
}