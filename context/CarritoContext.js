"use client";
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";

// Crear el contexto
const CarritoContext = createContext();

// Hook para usar el contexto de forma segura
export const useCarrito = () => useContext(CarritoContext);

// Proveedor del contexto
export function CarritoProvider({ children }) {
  const [carrito, setCarrito] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef();

  // Persistencia en localStorage y sincronización entre pestañas
  useEffect(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("carrito");
      if (guardado) setCarrito(JSON.parse(guardado));
      const syncCarrito = (e) => {
        if (e.key === "carrito") {
          setCarrito(e.newValue ? JSON.parse(e.newValue) : []);
        }
      };
      window.addEventListener("storage", syncCarrito);
      return () => window.removeEventListener("storage", syncCarrito);
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("carrito", JSON.stringify(carrito));
    }
  }, [carrito]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Lógica del carrito
  const agregar = useCallback((producto) => {
    const productoId = producto.id_producto ?? producto.id;
    setCarrito((prev) => {
      const existe = prev.find((p) => (p.id_producto ?? p.id) === productoId);
      if (existe) {
        return prev.map((p) =>
          (p.id_producto ?? p.id) === productoId
            ? { ...p, cantidad: p.cantidad + 1 }
            : p
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  }, []);
  const eliminar = useCallback((id) => {
    setCarrito((prev) =>
      prev.filter((p) => (p.id_producto ?? p.id) !== id)
    );
  }, []);
  const cambiarCantidad = useCallback((id, delta) => {
    setCarrito((prev) =>
      prev.map((p) =>
        (p.id_producto ?? p.id) === id
          ? { ...p, cantidad: p.cantidad + delta }
          : p
      )
    );
  }, []);
  const vaciar = useCallback(() => {
    setCarrito([]);
  }, []);

  // Recompra rápida
  const recompraRapida = useCallback((productosPedido, productosMap) => {
    const nuevosProductos = [...carrito];
    let productosFaltantes = 0;
    for (const prod of productosPedido) {
      const producto = productosMap.get(prod.id_producto);
      if (!producto) {
        productosFaltantes++;
        continue;
      }
      const existente = nuevosProductos.find(p => (p.id_producto ?? p.id) === prod.id_producto);
      if (existente) {
        existente.cantidad += prod.cantidad;
      } else {
        nuevosProductos.push({ ...producto, cantidad: prod.cantidad });
      }
    }
    setCarrito(nuevosProductos);
    if (productosFaltantes > 0) {
      showToast(
        `Algunos productos ya no están disponibles y no se han añadido (${productosFaltantes})`,
        "error"
      );
    } else {
      showToast("Productos añadidos al carrito");
    }
  }, [carrito, showToast]);

  return (
    <CarritoContext.Provider value={{
      carrito, setCarrito, agregar, eliminar, cambiarCantidad, vaciar,
      showToast, toast, recompraRapida
    }}>
      {children}
    </CarritoContext.Provider>
  );
}
