"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { fetchProductos, actualizarStock, fetchProductosPaginado } from "./api/productosapi";
import ProductoItem from "./components/productoItem";
import { realizarCompra } from "./api/pedidosapi";
import ModalCompra from "./components/modalCompra";
import ConfirmModal from "./components/confirmModal";
import ToastComponent from "./components/ToastComponent";
import useToast from "./hooks/useToast";
import useConfirmAction from "./hooks/useConfirmAction";
import useFavoritos from "./hooks/useFavoritos";
import useDebouncedValue from "./hooks/useDebouncedValue";
import AuthForm from "./components/authForm";
import TelefonoInput from "./components/TelefonoInput";
import { useRouter } from "next/navigation";
import { useCarrito } from "@/context/carritocontext";

export default function Page() {
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(0); // 0 = Todas
  const [loading, setLoading] = useState(true);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [toast, showToast] = useToast();
  const [metodoPago, setMetodoPago] = useState("");
  const [comprando, setComprando] = useState(false);
  const [modalCompraAbierto, setModalCompraAbierto] = useState(false);
  const [ultimoCarrito, setUltimoCarrito] = useState([]);
  const [compraExitosa, setCompraExitosa] = useState(false);
  const [compraTotal, setCompraTotal] = useState(0);
  const confirm = useConfirmAction();
  const [usuario, setUsuarioState] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const router = useRouter();
  const { favoritos, toggleFavorito } = useFavoritos();
  const [busqueda, setBusqueda] = useState("");
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [puntos, setPuntos] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const productosPorPagina = 12;
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [marca, setMarca] = useState("");
  const [stockMin, setStockMin] = useState("");
  const debouncedPrecioMin = useDebouncedValue(precioMin);
  const debouncedPrecioMax = useDebouncedValue(precioMax);
  const debouncedMarca = useDebouncedValue(marca);
  const debouncedStockMin = useDebouncedValue(stockMin);
  // Definición de setUsuario antes del callback que lo usa
  const setUsuario = useCallback((user) => {
    setUsuarioState(user);
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem("usuario", JSON.stringify(user));
      } else {
        localStorage.removeItem("usuario");
      }
    }
  }, []);
  // Callback optimizado para guardar teléfono y cerrar modal
  // Callback optimizado para guardar teléfono y cerrar modal (ahora guarda en la base de datos)
  const handleSaveTelefono = useCallback(async (tel) => {
    if (!usuario?.email) {
      showToast("No se puede guardar el teléfono sin email de usuario", "error");
      return;
    }
    try {
      const res = await fetch("/api/clientes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: usuario.email, telefono: tel })
      });
      if (!res.ok) throw new Error("Error al guardar el teléfono");
      setUsuario({ ...usuario, telefono: tel });
      setMostrarPerfil(false);
      showToast("Teléfono actualizado correctamente", "success");
    } catch (err) {
      showToast("No se pudo guardar el teléfono", "error");
    }
  }, [usuario, setUsuario, showToast]);
  // Limpia filtros al cambiar de categoría
  useEffect(() => {
    setPrecioMin("");
    setPrecioMax("");
    setMarca("");
    setStockMin("");
    setPagina(1);
  }, [categoriaSeleccionada]);
  // Historial de compras
  const cargarHistorial = () => {
    if (!usuario?.email) {
      showToast("Debes iniciar sesión para ver el historial", "error");
      return;
    }
    router.push("/historial");
  };
  // Memoiza productos por id para acceso rápido
  const productosMap = useMemo(() => {
    const arr = Array.isArray(productos) ? productos : [];
    const map = new Map();
    for (const p of arr) {
      map.set(p.id_producto ?? p.id, p);
    }
    return map;
  }, [productos]);
  // Obtener carrito y funciones de contexto
  const { carrito, agregar, eliminar, cambiarCantidad, vaciar } = useCarrito();
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
  }, [carrito, showToast, ultimoCarrito]);
  useEffect(() => {
    setLoading(true);
    fetch('/api/categorias')
      .then(res => res.json())
      .then(setCategorias)
      .catch(() => showToast("Error al cargar categorías", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);
  useEffect(() => {
    setLoading(true);
    fetchProductosPaginado({
      limit: productosPorPagina,
      offset: (pagina - 1) * productosPorPagina,
      categoria: categoriaSeleccionada,
      precioMin: debouncedPrecioMin !== "" ? debouncedPrecioMin : undefined,
      precioMax: debouncedPrecioMax !== "" ? debouncedPrecioMax : undefined,
      marca: debouncedMarca !== "" ? debouncedMarca : undefined,
      stock: debouncedStockMin !== "" ? debouncedStockMin : undefined
    })
      .then(({ productos, total }) => {
        setProductos(Array.isArray(productos) ? productos : []);
        setTotalPaginas(Math.ceil(total / productosPorPagina));
      })
      .catch(() => showToast("Error al cargar productos", "error"))
      .finally(() => setLoading(false));
  }, [pagina, categoriaSeleccionada, productosPorPagina, debouncedPrecioMin, debouncedPrecioMax, debouncedMarca, debouncedStockMin, showToast]);
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
    [agregar, carrito, showToast]
  );
  const handleDelete = (id) => {
    confirm.showConfirm(
      "Eliminar producto",
      "¿Estás seguro de que quieres eliminar este producto del carrito?",
      () => {
        eliminar(id);
        showToast("Producto eliminado", "success");
      }
    );
  };
  const handleVaciarCarrito = () => {
    confirm.showConfirm(
      "Vaciar carrito",
      "¿Seguro que quiere vaciar el carrito? Esta acción eliminará todos los productos.",
      () => {
        vaciar();
        showToast("Carrito vaciado", "success");
      }
    );
  };
  useEffect(() => {
    // Al montar, intenta cargar usuario de localStorage
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("usuario");
      if (user) {
        try {
          setUsuarioState(JSON.parse(user));
        } catch {}
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (usuario) {
        localStorage.setItem("usuario", JSON.stringify(usuario));
      } else {
        localStorage.removeItem("usuario");
      }
    }
  }, [usuario]);
  useEffect(() => {
    if (usuario?.email) {
      fetch(`/api/clientes?email=${encodeURIComponent(usuario.email)}`)
        .then(r => r.json())
        .then(data => setPuntos(data.puntos_fidelidad || 0))
        .catch(() => setPuntos(0));
    }
  }, [usuario]);
  const productosFiltrados = useMemo(() => {
    let arr = Array.isArray(productos) ? productos : [];
    if (busqueda.trim()) {
      const b = busqueda.trim().toLowerCase();
      arr = arr.filter(p =>
        p.nombre.toLowerCase().includes(b) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(b))
      );
    }
    return arr.filter(p => categoriaSeleccionada === 0 || p.id_categoria === categoriaSeleccionada);
  }, [productos, busqueda, categoriaSeleccionada]);
  const [showLoader, setShowLoader] = useState(false);
  useEffect(() => {
    let timeout;
    if (loading) {
      timeout = setTimeout(() => setShowLoader(true), 300);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timeout);
  }, [loading]);
  const descargarFactura = (pedido) => {
    const data = {
      pedido: pedido.id_pedido,
      fecha: pedido.fecha_pedido,
      total: pedido.total,
      productos: pedido.productos,
      metodo: pedido.metodo_pago,
      estado: pedido.estado
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factura_${pedido.id_pedido}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const MemoProductoItem = React.memo(ProductoItem);
  if (!usuario) {
    return <AuthForm onAuth={setUsuario} />;
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-800 min-h-screen flex flex-col antialiased">
      {/* Toast global */}
      {!modalCompraAbierto && <ToastComponent toast={toast} />}
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex flex-col sm:flex-row justify-between items-center shadow gap-2">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
          <h1 className="text-2xl font-bold">Tienda Deportiva</h1>
          {/* Filtro de categorías y filtros avanzados */}
          <div className="flex items-center gap-2">
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
            <input
              type="text"
              placeholder="Buscar"
              className="p-2 rounded border border-gray-300 text-black w-32"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="mín €"
              className="p-2 rounded border border-gray-300 text-black w-24"
              value={precioMin}
              onChange={e => setPrecioMin(e.target.value.replace(/^0+/, ""))}
              onBlur={e => setPrecioMin(e.target.value.replace(/^0+/, ""))}
            />
            <input
              type="number"
              min="0"
              placeholder="máx €"
              className="p-2 rounded border border-gray-300 text-black w-24"
              value={precioMax}
              onChange={e => setPrecioMax(e.target.value.replace(/^0+/, ""))}
              onBlur={e => setPrecioMax(e.target.value.replace(/^0+/, ""))}
            />
            <input
              type="text"
              placeholder="Marca"
              className="p-2 rounded border border-gray-300 text-black w-24"
              value={marca}
              onChange={e => setMarca(e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Stock mín."
              className="p-2 rounded border border-gray-300 text-black w-24"
              value={stockMin}
              onChange={e => setStockMin(e.target.value.replace(/^0+/, ""))}
              onBlur={e => setStockMin(e.target.value.replace(/^0+/, ""))}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto">
          <span className="bg-white text-blue-600 rounded px-2 py-1 font-bold mr-2">
            Puntos: {puntos}
          </span>
          {/* Icono/avatar de usuario para acceso al perfil */}
          <button
            className="bg-gray-200 text-blue-600 px-2 py-1 rounded-full hover:bg-gray-300 flex items-center gap-2 focus:outline-none"
            onClick={() => setMostrarPerfil(true)}
            aria-label="Abrir perfil de usuario"
          >
            <span className="text-xl">👤</span>
            <span className="hidden sm:inline">Perfil</span>
          </button>
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
          <button
            className="ml-2 bg-gray-200 text-blue-600 px-2 py-1 rounded hover:bg-gray-300"
            onClick={cargarHistorial}
            disabled={!usuario?.email}
          >
            Ver historial de compras
          </button>
          {/* Botón cerrar sesión con confirmación */}
          <button
            className="ml-2 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
            onClick={() => setConfirmLogout(true)}
            aria-label="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Modal perfil */}
      {mostrarPerfil && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-lg max-w-sm w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
              onClick={() => setMostrarPerfil(false)}
              aria-label="Cerrar"
            >✕</button>
            <h2 className="text-xl font-bold mb-4 text-blue-600">Perfil de usuario</h2>
            <div className="mb-2"><b>Nombre:</b> {usuario.nombre}</div>
            <div className="mb-2"><b>Email:</b> {usuario.email}</div>
            <div className="mb-2"><b>Puntos de fidelidad:</b> {puntos}</div>
            {/* Teléfono para 2FA como componente */}
            <TelefonoInput
              value={usuario.telefono || ""}
              onSave={handleSaveTelefono}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {/* Lista de productos */}
      <main className="flex-grow p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {showLoader ? (
          <div className="col-span-full text-center text-gray-500">Cargando productos...</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">No hay productos que mostrar</div>
        ) : (
          productosFiltrados.map((producto) => {
            const productoId = producto.id_producto ?? producto.id;
            const esFavorito = favoritos.includes(productoId);
            return (
              <div key={productoId} className="relative">
                <MemoProductoItem
                  producto={producto}
                  onAdd={() => handleAddProducto(producto)}
                  favoritos={favoritos}
                  toggleFavorito={toggleFavorito}
                />
                <button
                  className={`absolute top-2 right-2 text-2xl focus:outline-none ${esFavorito ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"}`}
                  title={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
                  aria-label={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
                  onClick={() => toggleFavorito(productoId)}
                >
                  {esFavorito ? "★" : "☆"}
                </button>
              </div>
            );
          })
        )}
      </main>

      {/* Paginación */}
      <nav
        aria-label="Paginación de productos"
        className="p-4 flex justify-center gap-4 flex-wrap"
      >
        <button
          className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina === 1}
          aria-label="Página anterior"
        >
          « Anterior
        </button>
        <span className="p-2 rounded border border-gray-300 bg-white text-blue-600 font-bold">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          disabled={pagina === totalPaginas}
          aria-label="Página siguiente"
        >
          Siguiente »
        </button>
      </nav>

      {/* Carrito */}
      {mostrarCarrito && (
        <aside
          aria-label="Carrito de compras"
          className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-lg p-4 overflow-auto z-40"
        >
          <h2 className="text-xl font-bold mb-4">Carrito</h2>
          {carrito.length === 0 ? (
            <p>El carrito está vacío</p>
          ) : (
            <ul className="divide-y divide-gray-300 dark:divide-gray-700">
              {carrito.map((item) => (
                <li key={item.id_producto ?? item.id} className="py-2 flex items-center gap-2">
                  <div className="flex-grow">
                    <p className="font-semibold">{item.nombre}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Precio: €{item.precio} × {item.cantidad}
                    </p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <button
                      aria-label={`Disminuir cantidad de ${item.nombre}`}
                      onClick={() => cambiarCantidad(item.id_producto ?? item.id, -1)}
                      disabled={item.cantidad <= 1}
                      className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      –
                    </button>
                    <span aria-live="polite" aria-atomic="true" className="w-6 text-center">
                      {item.cantidad}
                    </span>
                    <button
                      aria-label={`Aumentar cantidad de ${item.nombre}`}
                      onClick={() => cambiarCantidad(item.id_producto ?? item.id, 1)}
                      disabled={item.cantidad >= item.stock}
                      className="p-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      +
                    </button>
                    <button
                      aria-label={`Eliminar ${item.nombre} del carrito`}
                      onClick={() => handleDelete(item.id_producto ?? item.id)}
                      className="p-1 rounded bg-red-500 text-white hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-gray-300 dark:border-gray-700 pt-4">
            <p className="font-bold text-lg">Total: €{total.toFixed(2)}</p>
            <button
              disabled={carrito.length === 0 || comprando}
              onClick={() => setModalCompraAbierto(true)}
              className={`mt-2 w-full py-2 rounded ${
                carrito.length === 0 || comprando
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white font-semibold`}
              aria-disabled={carrito.length === 0 || comprando}
            >
              {comprando ? "Procesando compra..." : "Comprar"}
            </button>
            <button
              onClick={handleVaciarCarrito}
              disabled={carrito.length === 0 || comprando}
              className="mt-2 w-full py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
              aria-disabled={carrito.length === 0 || comprando}
            >
              Vaciar carrito
            </button>
          </div>
        </aside>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center p-4 mt-10">
        © 2025 Tienda Deportiva
      </footer>

      {/* Modal de compra */}
      {modalCompraAbierto && (
        <ModalCompra
          open={modalCompraAbierto}
          carrito={carrito}
          total={total}
          emailCliente={usuario?.email}
          metodoPago={metodoPago}
          setMetodoPago={setMetodoPago}
          comprando={comprando}
          setComprando={setComprando}
          onCerrar={() => setModalCompraAbierto(false)}
          vaciar={vaciar}
          showToast={showToast}
          fetchProductos={fetchProductos}
          setProductos={setProductos}
          productosMap={productosMap}
          actualizarStock={actualizarStock}
          realizarCompra={realizarCompra}
          setCompraTotal={setCompraTotal}
          setCompraExitosa={setCompraExitosa}
        />
      )}

      {/* Modal de confirmación de compra exitosa */}
      {compraExitosa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4 text-green-600">¡Compra realizada!</h2>
            <p className="mb-4">Gracias por tu compra. Total pagado: <span className="font-bold">{compraTotal.toFixed(2)}€</span></p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={async () => {
                setCompraExitosa(false);
                setCompraTotal(0);
                setPagina(1);
                setCategoriaSeleccionada(0);
                setBusqueda("");
                setPrecioMin("");
                setPrecioMax("");
                setMarca("");
                setStockMin("");
                setLoading(true);
                const { productos, total } = await fetchProductosPaginado({
                  limit: productosPorPagina,
                  offset: 0,
                  categoria: 0
                });
                setProductos(Array.isArray(productos) ? productos : []);
                setTotalPaginas(Math.ceil(total / productosPorPagina));
                setLoading(false);
              }}
              aria-label="Cerrar confirmación"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal para acciones y cierre de sesión */}
      <ConfirmModal
        open={confirm.confirmState.open || confirmLogout}
        titulo={confirmLogout ? "Cerrar sesión" : confirm.confirmState.titulo}
        mensaje={confirmLogout ? "¿Quieres cerrar la sesión?" : confirm.confirmState.mensaje}
        cerrar={confirmLogout}
        onConfirm={confirmLogout
          ? () => {
              setUsuario(null);
              setConfirmLogout(false);
              router.refresh();
            }
          : confirm.handleConfirm}
        onCancel={confirmLogout
          ? () => setConfirmLogout(false)
          : confirm.handleCancel}
      />
    </div>
  );
}