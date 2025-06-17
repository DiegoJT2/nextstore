"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchProductos } from "./api/productosapi";
import ProductoItem from "./components/ProductoItem";

// Hook personalizado para el carrito
function useCarrito() {
  const [carrito, setCarrito] = useState([]);
  useEffect(() => {
    const guardado =
      typeof window !== "undefined" ? localStorage.getItem("carrito") : null;
    if (guardado) setCarrito(JSON.parse(guardado));
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("carrito", JSON.stringify(carrito));
    }
  }, [carrito]);
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
          ? { ...p, cantidad: Math.max(1, p.cantidad + delta) }
          : p
      )
    );
  }, []);
  return { carrito, agregar, eliminar, cambiarCantidad };
}

// Hook para toasts
function useToast() {
  const [toast, setToast] = useState(null);
  const timeoutRef = React.useRef();

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const Toast = toast ? (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-white transition-all duration-300 ${
        toast.type === "error" ? "bg-red-500" : "bg-green-500"
      }`}
      role="alert"
      aria-live="assertive"
    >
      {toast.msg}
    </div>
  ) : null;
  return [Toast, showToast];
}

export default function Page() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const { carrito, agregar, eliminar, cambiarCantidad } = useCarrito();
  const [Toast, showToast] = useToast();

  useEffect(() => {
    setLoading(true);
    fetchProductos()
      .then(setProductos)
      .catch(() => showToast("Error al cargar productos", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(
    () => carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0),
    [carrito]
  );
  const cantidadCarrito = useMemo(
    () => carrito.reduce((acc, p) => acc + p.cantidad, 0),
    [carrito]
  );

  // Memoiza la función para evitar renders innecesarios
  const handleAddProducto = useCallback(
    (producto) => {
      const productoId = producto.id_producto ?? producto.id;
      const enCarrito = carrito.find(
        (p) => (p.id_producto ?? p.id) === productoId
      );
      const cantidadEnCarrito = enCarrito ? enCarrito.cantidad : 0;
      if (producto.stock !== undefined && cantidadEnCarrito >= producto.stock) {
        showToast("No queda stock disponible", "error");
        return;
      }
      agregar(producto);
      // Mueve el toast a un efecto para que se muestre después de actualizar el carrito
      // showToast("Producto añadido al carrito");
    },
    [carrito, agregar, showToast]
  );

  // Añade este efecto para mostrar el toast solo cuando cambia el carrito
  useEffect(() => {
    if (carrito.length > 0) {
      // Opcional: puedes refinar esto si quieres evitar mostrar el toast en la carga inicial
      showToast("Producto añadido al carrito");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrito]);

  return (
    <div className="bg-gray-100 dark:bg-gray-800 min-h-screen flex flex-col antialiased">
      {Toast}
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow">
        <h1 className="text-2xl font-bold">Tienda Deportiva</h1>
        <button
          id="icono-carrito"
          className="cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white transition"
          aria-label="Abrir carrito"
          onClick={() => setMostrarCarrito((v) => !v)}
        >
          <span role="img" aria-label="carrito">
            🛒
          </span>
          <span>Carrito</span>
          <span
            id="contador-carrito"
            className="font-bold bg-white text-blue-600 rounded px-2 py-0.5 ml-1 transition"
          >
            {cantidadCarrito}
          </span>
        </button>
      </header>

      <main className="p-4 flex-1">
        {/* Carrito */}
        <section
          id="carrito"
          className={`mt-8 ${mostrarCarrito ? "" : "hidden"} bg-white dark:bg-gray-700 rounded shadow p-4 max-w-lg mx-auto transition-all duration-300`}
          aria-live="polite"
        >
          <h2 className="text-xl font-semibold mb-2">Mi Carrito</h2>
          <ul id="lista-carrito" className="mb-4">
            {carrito.length === 0 && (
              <li className="text-gray-500 dark:text-gray-300">
                El carrito está vacío.
              </li>
            )}
            {carrito.map((prod) => (
              <li
                key={prod.id_producto ?? prod.id}
                className="mb-2"
              >
                <ProductoItem
                  producto={prod}
                  enCarrito
                  cantidad={prod.cantidad}
                  onRemove={() => eliminar(prod.id_producto ?? prod.id)}
                  onChangeCantidad={(delta) =>
                    cambiarCantidad(prod.id_producto ?? prod.id, delta)
                  }
                />
              </li>
            ))}
          </ul>
          <p className="font-bold text-right">
            Total: <span id="total">{total.toFixed(2)}€</span>
          </p>
        </section>

        {/* Loader */}
        {loading && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-blue-600 font-semibold">
              Cargando productos...
            </span>
          </div>
        )}

        {/* Productos */}
        <section
          id="productos"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          aria-label="Lista de productos"
        >
          {!loading &&
            productos.map((producto) => (
              <ProductoItem
                key={producto.id_producto ?? producto.id}
                producto={producto}
                onAdd={() => handleAddProducto(producto)}
              />
            ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center p-4 mt-10">
        © 2025 Tienda Deportiva
      </footer>
    </div>
  );
}