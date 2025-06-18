"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { fetchProductos, actualizarStock, fetchProductosPaginado } from "./api/productosapi";
import ProductoItem from "./components/ProductoItem";
import { realizarCompra } from "./api/pedidosapi";
import ModalCompra from "./components/ModalCompra";
import ConfirmModal from "./components/ConfirmModal";
import AuthForm from "./components/AuthForm";
import { useRouter } from "next/navigation";
import { useCarrito } from "@/context/CarritoContext";

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

// Hook para debounce de filtros
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

// Hook para favoritos (localStorage)
function useFavoritos() {
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

export default function Page() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(0); // 0 = Todas
  const [loading, setLoading] = useState(true);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [toast, showToast] = useToast();
  // Estado para el método de pago
  const [metodoPago, setMetodoPago] = useState("");
  // Estado para loading de compra y confirmación
  const [comprando, setComprando] = useState(false);
  const [compraExitosa, setCompraExitosa] = useState(false);
  const [compraTotal, setCompraTotal] = useState(0);
  const [modalCompraAbierto, setModalCompraAbierto] = useState(false);
  const [ultimoCarrito, setUltimoCarrito] = useState([]);
  const [confirmarEliminacion, setConfirmarEliminacion] = useState({ abierto: false, id: null });
  const [usuario, setUsuarioState] = useState(null);
  const [confirmarLogout, setConfirmarLogout] = useState(false);
  const router = useRouter();
  const { favoritos, toggleFavorito } = useFavoritos();
  const [busqueda, setBusqueda] = useState("");
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [puntos, setPuntos] = useState(0);

  // Paginación de productos
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const productosPorPagina = 12;

  // Filtros avanzados
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [marca, setMarca] = useState("");
  const [stockMin, setStockMin] = useState("");

  // Debounced values para evitar llamadas excesivas
  const debouncedPrecioMin = useDebouncedValue(precioMin);
  const debouncedPrecioMax = useDebouncedValue(precioMax);
  const debouncedMarca = useDebouncedValue(marca);
  const debouncedStockMin = useDebouncedValue(stockMin);

  // Limpia filtros al cambiar de categoría
  useEffect(() => {
    setPrecioMin("");
    setPrecioMax("");
    setMarca("");
    setStockMin("");
    setPagina(1);
  }, [categoriaSeleccionada]);

  // Historial de compras
  const [historial, setHistorial] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
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

  // Calcula total y cantidad solo si hay productos en el carrito
  const total = useMemo(
    () => carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0),
    []
  );
  const cantidadCarrito = useMemo(
    () => carrito.reduce((acc, p) => acc + p.cantidad, 0),
    []
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
    // fetchCategoriasConCache()
    //   .then(setCategorias)
    //   .catch(() => showToast("Error al cargar categorías", "error"))
    //   .finally(() => setLoading(false));
    // Sustituye por fetchCategorias si quieres mantener la carga de categorías
    fetch('/api/categorias')
      .then(res => res.json())
      .then(setCategorias)
      .catch(() => showToast("Error al cargar categorías", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar productos paginados con filtros correctos
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
    [showToast] // Solo se incluye showToast como dependencia
  );

  // Nueva función para eliminar con confirmación
  const handleEliminar = (id) => {
    setConfirmarEliminacion({ abierto: true, id });
  };
  const confirmarEliminarProducto = () => {
    if (confirmarEliminacion.id) {
      eliminar(confirmarEliminacion.id);
    }
    setConfirmarEliminacion({ abierto: false, id: null });
  };
  const cancelarEliminarProducto = () => {
    setConfirmarEliminacion({ abierto: false, id: null });
  };

  // Persistencia de usuario autenticado
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
  // Guarda usuario en localStorage al cambiar
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (usuario) {
        localStorage.setItem("usuario", JSON.stringify(usuario));
      } else {
        localStorage.removeItem("usuario");
      }
    }
  }, [usuario]);

  // Wrapper para setUsuario que sincroniza con localStorage
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

  // Cargar puntos de fidelidad al iniciar sesión
  useEffect(() => {
    if (usuario?.email) {
      fetch(`/api/clientes?email=${encodeURIComponent(usuario.email)}`)
        .then(r => r.json())
        .then(data => setPuntos(data.puntos_fidelidad || 0))
        .catch(() => setPuntos(0));
    }
  }, [usuario]);

  // Búsqueda y favoritos en productos
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

  // Loader solo si loading > 300ms
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

  // Descargar factura (JSON simulado)
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

  // React.memo para ProductoItem
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
          {/* Filtro de categorías */}
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
          {/* Filtros avanzados */}
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
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="bg-white text-blue-600 rounded px-2 py-1 font-bold mr-2">
            Puntos: {puntos}
          </span>
          <button
            className="bg-gray-200 text-blue-600 px-2 py-1 rounded hover:bg-gray-300"
            onClick={() => setMostrarPerfil(true)}
          >
            Perfil
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
            onClick={() => setConfirmarLogout(true)}
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
          </div>
        </div>
      )}

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
                  onRemove={() => handleEliminar(prod.id_producto ?? prod.id)}
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
        {showLoader && (
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
            productosFiltrados.map((producto) => (
              <div key={producto.id_producto ?? producto.id} className="relative">
                <MemoProductoItem
                  producto={producto}
                  onAdd={() => handleAddProducto(producto)}
                  enCarrito={false}
                />
                <button
                  className={`absolute top-2 right-2 text-2xl ${favoritos.includes(producto.id_producto ?? producto.id) ? "text-red-500" : "text-gray-400"} hover:text-red-600 transition`}
                  onClick={() => toggleFavorito(producto.id_producto ?? producto.id)}
                  aria-label="Favorito"
                  type="button"
                >
                  ♥
                </button>
              </div>
            ))}
        </section>
        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <button
              onClick={() => setPagina(p => Math.max(p - 1, 1))}
              disabled={pagina === 1}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            >
              ← Anterior
            </button>
            <span className="font-semibold text-blue-700">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        )}
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
              onClick={() => {
                setCompraExitosa(false);
                setCompraTotal(0);
                fetchProductos(true).then(setProductos);
              }}
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
        emailCliente={usuario?.email || ""}
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

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        open={confirmarEliminacion.abierto}
        onConfirm={confirmarEliminarProducto}
        onCancel={cancelarEliminarProducto}
        mensaje="¿Estás seguro de que deseas eliminar este producto del carrito?"
      />

      {/* Modal de confirmación de logout */}
      <ConfirmModal
        open={confirmarLogout}
        onConfirm={() => {
          setUsuario(null);
          setConfirmarLogout(false);
        }}
        onCancel={() => setConfirmarLogout(false)}
        mensaje="¿Seguro que quieres cerrar sesión?"
        cerrar={true}
      />
    </div>
  );
}