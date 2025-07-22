import { useState, useEffect, useCallback } from "react";

export default function useFavoritos() {
  const [favoritos, setFavoritos] = useState([]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const fav = localStorage.getItem("favoritos");
      if (fav) setFavoritos(JSON.parse(fav));
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("favoritos", JSON.stringify(favoritos));
    }
  }, [favoritos]);
  const toggleFavorito = useCallback((id) => {
    setFavoritos((prev) =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }, []);
  return { favoritos, toggleFavorito };
}
