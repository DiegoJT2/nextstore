"use client";
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";

// Crear contexto
const CarritoContext = createContext();
export const useCarrito = () => useContext(CarritoContext);

export function CarritoProvider({ children }) {
  const [carrito, setCarrito] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef();

  // Cargar carrito desde localStorage
  useEffect(() => {
    const guardado = localStorage.getItem("carrito");
    if (guardado) setCarrito(JSON.parse(guardado));

    const syncCarrito = (e) => {
      if (e.key === "carrito") {
        setCarrito(e.newValue ? JSON.parse(e.newValue) : []);
      }
    };
    window.addEventListener("storage", syncCarrito);
    return () => window.removeEventListener("storage", syncCarrito);
  }, []);

  // Guardar carrito en localStorage
  useEffect(() => {
    localStorage.setItem("carrito", JSON.stringify(carrito));
  }, [carrito]);

  // Mostrar toast con temporizador
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // Agregar producto
  const agregar = useCallback((producto) => {
    const id = producto.id_producto ?? producto.id;
    setCarrito((prev) => {
      const existe = prev.find((p) => (p.id_producto ?? p.id) === id);
      if (existe) {
        return prev.map((p) =>
          (p.id_producto ?? p.id) === id
            ? { ...p, cantidad: p.cantidad + 1 }
            : p
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    showToast("Producto añadido al carrito");
  }, [showToast]);


  // Eliminar producto
  const eliminar = useCallback(
    (id) => {
      console.log("Eliminar producto con id:", id);
      const idStr = String(id); // Asegura que ambos lados sean string
      setCarrito((prev) => {
        const nuevo = prev.filter((p) => String(p.id_producto ?? p.id) !== idStr);
        console.log("Carrito tras eliminar:", nuevo);
        return nuevo;
      });
      showToast("Producto eliminado del carrito");
    },
    [showToast]
  );

  // Cambiar cantidad
  const cambiarCantidad = useCallback((id, delta) => {
    setCarrito((prev) =>
      prev.map((p) =>
        (p.id_producto ?? p.id) === id
          ? { ...p, cantidad: p.cantidad + delta }
          : p
      )
    );
  }, []);

  // Vaciar carrito
  const vaciar = useCallback(() => setCarrito([]), []);

  // Recompra rápida
  const recompraRapida = useCallback(
    (productosPedido, productosMap) => {
      const nuevos = [...carrito];
      let faltan = 0;

      for (const prod of productosPedido) {
        const producto = productosMap.get(prod.id_producto);
        if (!producto) {
          faltan++;
          continue;
        }
        const existente = nuevos.find(
          (p) => (p.id_producto ?? p.id) === prod.id_producto
        );
        if (existente) {
          existente.cantidad += prod.cantidad;
        } else {
          nuevos.push({ ...producto, cantidad: prod.cantidad });
        }
      }

      setCarrito(nuevos);
      if (faltan > 0) {
        showToast(
          `Algunos productos ya no están disponibles (${faltan})`,
          "error"
        );
      } else {
        showToast("Productos añadidos al carrito");
      }
    },
    [carrito, showToast]
  );

  // 🔒 Memoizar el `value` del contexto para evitar renders innecesarios
  const value = useMemo(
    () => ({
      carrito,
      setCarrito,
      agregar,
      eliminar,
      cambiarCantidad,
      vaciar,
      showToast,
      toast,
      recompraRapida,
    }),
    [
      carrito,
      agregar,
      eliminar,
      cambiarCantidad,
      vaciar,
      showToast,
      toast,
      recompraRapida,
    ]
  );

  return (
    <CarritoContext.Provider value={value}>
      {children}
    </CarritoContext.Provider>
  );
}