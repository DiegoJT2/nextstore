import React from "react";
import { realizarCompra } from "./usecompra";

export default function ModalCompra({
  open,
  toast,
  emailCliente,
  metodoPago,
  setMetodoPago,
  comprando,
  carrito,
  productosMap,
  fetchProductos,
  setProductos,
  vaciar,
  setCompraTotal,
  setCompraExitosa,
  onCerrar,
  setComprando,
  showToast,
  validarDatosCompra,
  actualizarStock,
  total,
}) {
  // Validación por defecto si no se pasa la función
  const validar = validarDatosCompra || ((email, metodoPago) => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return "Debes introducir un correo válido";
    }
    if (!metodoPago) {
      return "Debes elegir un método de pago";
    }
    return null;
  });
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Toast centrado en el modal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
        {toast}
      </div>
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-lg max-w-md w-full relative z-60">
        <h2 className="text-xl font-bold mb-4 text-blue-600">Finalizar compra</h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (comprando) return;

            const error = validar(emailCliente, metodoPago);
            if (error) {
              showToast(error, "error");
              return;
            }

            setComprando(true);
            try {
              // Buscar el id_cliente por email en el backend
              const res = await fetch(
                `/api/clientes?email=${encodeURIComponent(emailCliente)}`
              );
              if (!res.ok) {
                showToast("Error al consultar el cliente", "error");
                return;
              }
              const data = await res.json();

              if (data?.message === "El correo no existe") {
                showToast("El correo introducido no existe", "error");
                return;
              }
              if (!data?.id_cliente) {
                throw new Error("Cliente no encontrado");
              }

              // Realizar compra con función mejorada
              const pedidoRes = await realizarCompra({
                id_cliente: data.id_cliente,
                total,
                metodo_pago: metodoPago,
                productos: carrito.map((p) => ({
                  id_producto: p.id_producto ?? p.id,
                  cantidad: p.cantidad,
                  precio_unitario: p.precio,
                })),
              });

              if (pedidoRes.error) {
                showToast(`Error: ${pedidoRes.error}`, "error");
                return;
              }

              // Actualizar stock para cada producto
              await Promise.all(
                carrito.map((p) => {
                  const productoActual = productosMap.get(p.id_producto ?? p.id);
                  const nuevoStock = (productoActual?.stock ?? 0) - p.cantidad;
                  return actualizarStock(p.id_producto ?? p.id, nuevoStock);
                })
              );

              // Refrescar productos
              const nuevosProductos = await fetchProductos(true);
              setProductos(Array.isArray(nuevosProductos) ? nuevosProductos : []);
              vaciar();
              setCompraTotal(total);
              setCompraExitosa(true);
              onCerrar();
              setMetodoPago("");
            } catch (e) {
              showToast(
                e?.message ? `Error: ${e.message}` : "Error al tramitar el pedido",
                "error"
              );
            } finally {
              setComprando(false);
            }
          }}
        >
          {/* Mostrar email autenticado (solo lectura) */}
          <div className="p-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white min-w-[220px] bg-gray-100 text-gray-700 cursor-not-allowed select-none">
            {emailCliente}
          </div>
          <select
            className="p-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            required
            disabled={comprando}
          >
            <option value="">Método de pago</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="paypal">PayPal</option>
            <option value="efectivo">Efectivo</option>
          </select>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="flex-1 btn-modal-cancel"
              onClick={() => {
                onCerrar();
                setMetodoPago("");
              }}
              disabled={comprando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50 flex items-center justify-center"
              disabled={
                carrito.length === 0 ||
                !emailCliente ||
                !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailCliente) ||
                !metodoPago ||
                comprando
              }
              aria-label="Comprar"
            >
              {comprando ? (
                <>
                  <span className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block"></span>
                  Procesando...
                </>
              ) : (
                "Comprar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}