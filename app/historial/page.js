"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCarrito } from "@/context/CarritoContext";

// Toast animado y elegante
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded shadow-lg text-white transition-all duration-500 ease-out animate-fade-in-up ${
        toast.type === "error" ? "bg-red-500" : "bg-green-500"
      }`}
      role="alert"
      aria-live="polite"
    >
      {toast.msg}
    </div>
  );
}

// Obtener usuario desde localStorage
function getUsuario() {
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("usuario");
    if (user) {
      try {
        return JSON.parse(user);
      } catch {}
    }
  }
  return null;
}

export default function HistorialPage() {
  const [usuario, setUsuario] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, recompraRapida } = useCarrito();

  // Toast seguro para evitar superposiciones si hay muchos clics rápidos
  const toastTimeout = React.useRef();
  // Renombrar la función local para evitar conflicto
  const showToastLocal = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimeout.current), []);

  // Memoiza productos por id para acceso rápido y escalable
  const productosMap = useMemo(() => {
    const map = new Map();
    for (const p of productos) {
      map.set(p.id_producto ?? p.id, p);
    }
    return map;
  }, [productos]);

  useEffect(() => {
    const user = getUsuario();
    setUsuario(user);
    if (user?.email) {
      Promise.all([
        fetch(`/api/pedidos?email=${encodeURIComponent(user.email)}`).then(r => r.json()),
        fetch("/api/productos").then(r => r.json())
      ]).then(([hist, prods]) => {
        setHistorial(hist.pedidos || []);
        setProductos(Array.isArray(prods.productos) ? prods.productos : prods);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // handleRecompra usando el contexto global
  const handleRecompra = useCallback((productosPedido) => {
    recompraRapida(productosPedido, productosMap);
  }, [recompraRapida, productosMap]);

  if (!usuario) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 p-8 rounded shadow text-center">
          <h2 className="text-xl font-bold mb-4 text-blue-600">Debes iniciar sesión para ver tu historial</h2>
          <Link href="/" className="text-blue-600 underline">Volver a la tienda</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast toast={toast} />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded shadow-lg p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
              <span role="img" aria-label="historial">🧾</span>
              Historial de compras
            </h1>
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-800 text-lg"
              aria-label="Volver"
              title="Volver a la tienda"
            >⟵ Volver</Link>
          </div>
          {loading ? (
            <div className="text-center py-12 text-blue-600 font-semibold">Cargando historial...</div>
          ) : historial.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No hay compras registradas.</p>
          ) : (
            <div className="flex flex-col gap-8">
              {historial.map((pedido) => (
                <div key={pedido.id_pedido} className="border rounded-lg shadow p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                    <div>
                      <span className="font-bold text-blue-700 dark:text-blue-300">Pedido #{pedido.id_pedido}</span>
                      <span className="ml-4 text-gray-600">
                        {(() => {
                          const fecha = new Date(pedido.fecha_pedido);
                          const fechaStr = fecha.toLocaleDateString();
                          const horaStr = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                          return `${fechaStr} - ${horaStr}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      <span className="font-bold text-green-700 dark:text-green-300">Total: {pedido.total}€</span>
                      <span className="capitalize">Método: {pedido.metodo_pago}</span>
                      <span className={`font-semibold ${
                        pedido.estado === "pendiente"
                          ? "text-yellow-600"
                          : pedido.estado === "completado"
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}>{pedido.estado}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-separate border-spacing-y-2">
                      <thead>
                        <tr className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          <th className="px-2 py-1 rounded-l">Producto</th>
                          <th className="px-2 py-1">Nombre</th>
                          <th className="px-2 py-1">Cantidad</th>
                          <th className="px-2 py-1">Precio unitario</th>
                          <th className="px-2 py-1 rounded-r">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedido.productos.map((prod, i) => {
                          const producto = productosMap.get(prod.id_producto);
                          const nombre = producto ? producto.nombre : prod.id_producto;
                          const imagen = producto?.imagen?.trim()
                            ? `/img/${producto.imagen}`
                            : "/img/default.webp";
                          return (
                            <tr key={i}
                              className={`transition hover:bg-blue-50 dark:hover:bg-blue-950 ${
                                i % 2 === 0 ? "bg-gray-50 dark:bg-gray-800" : "bg-white dark:bg-gray-900"
                              }`}
                            >
                              <td className="px-2 py-1 text-center">
                                <Image
                                  src={imagen}
                                  alt={nombre}
                                  width={48}
                                  height={48}
                                  className="object-contain rounded shadow mx-auto"
                                  style={{ background: "#f3f4f6", width: 48, height: 48 }}
                                />
                              </td>
                              <td className="px-2 py-1 font-semibold text-blue-700 dark:text-blue-300">{nombre}</td>
                              <td className="px-2 py-1">{prod.cantidad}</td>
                              <td className="px-2 py-1">{prod.precio_unitario}€</td>
                              <td className="px-2 py-1 font-bold">{(prod.precio_unitario * prod.cantidad).toFixed(2)}€</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Botón de recompra */}
                  <div className="mt-4 text-right">
                    <button
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded"
                      onClick={() => handleRecompra(pedido.productos)}
                      disabled={loading}
                    >
                      🛍 Repetir compra
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}