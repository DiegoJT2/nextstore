"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { fetchProductos, actualizarStock } from "./api/productosapi";
import { fetchCategorias } from "./api/categoriasapi";
import ProductoItem from "./components/ProductoItem";
import { realizarCompra } from "./api/pedidosapi";
import ModalCompra from "./components/ModalCompra";

// Componente Toast reutilizable
function ToastComponent({ toast }) {
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
  const vaciar = useCallback(() => {
    setCarrito([]);
  }, []);
  return { carrito, agregar, eliminar, cambiarCantidad, vaciar };
}

// Hook para toasts
function useToast() {
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

// Utilidad para validar email y método de pago (fuera del componente)
function validarDatosCompra(email, metodoPago) {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return "Debes introducir un correo válido";
  }
  if (!metodoPago) {
    return "Debes elegir un método de pago";
  }
  return null;
}

export default function Page() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(0); // 0 = Todas
  const [loading, setLoading] = useState(true);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const { carrito, agregar, eliminar, cambiarCantidad, vaciar } = useCarrito();
  const [toast, showToast] = useToast();
  // Estado para el email del cliente y método de pago
  const [emailCliente, setEmailCliente] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  // Estado para loading de compra y confirmación
  const [comprando, setComprando] = useState(false);
  const [compraExitosa, setCompraExitosa] = useState(false);
  const [compraTotal, setCompraTotal] = useState(0);
  const [modalCompraAbierto, setModalCompraAbierto] = useState(false);
  const [ultimoCarrito, setUltimoCarrito] = useState([]);

  // Memoiza productos por id para acceso rápido
  const productosMap = useMemo(() => {
    const map = new Map();
    for (const p of productos) {
      map.set(p.id_producto ?? p.id, p);
    }
    return map;
  }, [productos]);

  // Calcula total y cantidad solo si hay productos en el carrito
  const total = useMemo(
    () => carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0),
    [carrito]
  );
  const cantidadCarrito = useMemo(
    () => carrito.reduce((acc, p) => acc + p.cantidad, 0),
    [carrito]
  );

  // Solo muestra el toast de "añadido" si se añade un producto nuevo al carrito (no al cambiar cantidad)
  useEffect(() => {
    if (!ultimoCarrito.length) {
      setUltimoCarrito(carrito);
      return;
    }
    const idsAntes = new Set(ultimoCarrito.map(p => p.id_producto ?? p.id));
    const idsAhora = new Set(carrito.map(p => p.id_producto ?? p.id));
    if (idsAhora.size > idsAntes.size) {
      showToast("Producto añadido al carrito");
    }
    setUltimoCarrito(carrito);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrito]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchProductos().then(setProductos).catch(() => showToast("Error al cargar productos", "error")),
      fetchCategorias().then(setCategorias).catch(() => showToast("Error al cargar categorías", "error"))
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handleAddProducto optimizado
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
    },
    [carrito, agregar, showToast]
  );

  return (
    <div className="bg-gray-100 dark:bg-gray-800 min-h-screen flex flex-col antialiased">
      {/* Toast global */}
      {!modalCompraAbierto && <ToastComponent toast={toast} />}
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex flex-col sm:flex-row justify-between items-center shadow gap-2">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
          <h1 className="text-2xl font-bold">Tienda Deportiva</h1>
          {/* Filtro de categorías en el encabezado */}
          <select
            className="p-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white text-black sm:ml-4"
            value={categoriaSeleccionada}
            onChange={e => setCategoriaSeleccionada(Number(e.target.value))}
          >
            <option value={0}>Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
            ))}
          </select>
        </div>
        <button
          id="icono-carrito"
          className="cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-white transition mt-2 sm:mt-0"
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
        {/* Quita el formulario de aquí */}
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
          <p className="font-bold text-right mb-4">
            Total: <span id="total">{total.toFixed(2)}€</span>
          </p>
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
            disabled={carrito.length === 0 || comprando}
            onClick={() => setModalCompraAbierto(true)}
            aria-label="Comprar"
          >
            Comprar
          </button>
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
            productos
              .filter(p => categoriaSeleccionada === 0 || p.id_categoria === categoriaSeleccionada)
              .map((producto) => (
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

      {/* Modal de confirmación de compra */}
      {compraExitosa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4 text-green-600">¡Compra realizada!</h2>
            <p className="mb-4">Gracias por tu compra. Total pagado: <span className="font-bold">{compraTotal.toFixed(2)}€</span></p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() => setCompraExitosa(false)}
              aria-label="Cerrar confirmación"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de compra como componente */}
      <ModalCompra
        open={modalCompraAbierto}
        toast={<ToastComponent toast={toast} />}
        emailCliente={emailCliente}
        setEmailCliente={setEmailCliente}
        metodoPago={metodoPago}
        setMetodoPago={setMetodoPago}
        comprando={comprando}
        carrito={carrito}
        productosMap={productosMap}
        fetchProductos={fetchProductos}
        setProductos={setProductos}
        vaciar={vaciar}
        setCompraTotal={setCompraTotal}
        setCompraExitosa={setCompraExitosa}
        setModalCompraAbierto={setModalCompraAbierto}
        setComprando={setComprando}
        showToast={showToast}
        realizarCompra={realizarCompra}
        validarDatosCompra={validarDatosCompra}
        actualizarStock={actualizarStock}
        total={total}
      />
    </div>
  );
}