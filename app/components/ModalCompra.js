import React from "react";

export default function ModalCompra({
  open,
  toast,
  emailCliente,
  setEmailCliente,
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
  setModalCompraAbierto,
  setComprando,
  showToast,
  realizarCompra,
  validarDatosCompra,
  actualizarStock,
  total
}) {
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
            const error = validarDatosCompra(emailCliente, metodoPago);
            if (error) {
              showToast(error, "error");
              return;
            }
            setComprando(true);
            try {
              // Buscar el id_cliente por email en el backend
              const res = await fetch(`/api/clientes?email=${encodeURIComponent(emailCliente)}`);
              const data = await res.json();
              if (data && data.message === 'El correo no existe') {
                showToast('El correo introducido no existe', 'error');
                setComprando(false);
                return;
              }
              if (!data || !data.id_cliente) throw new Error('Cliente no encontrado');
              const pedidoRes = await realizarCompra({
                id_cliente: data.id_cliente,
                total,
                metodo_pago: metodoPago,
                productos: carrito.map(p => ({
                  id_producto: p.id_producto ?? p.id,
                  cantidad: p.cantidad,
                  precio_unitario: p.precio
                }))
              });
              if (pedidoRes && pedidoRes.error) {
                showToast(`Error: ${pedidoRes.error}`, 'error');
                setComprando(false);
                return;
              }
              // Actualiza el stock en la base de datos para cada producto usando productosMap
              await Promise.all(carrito.map(p => {
                const productoActual = productosMap.get(p.id_producto ?? p.id);
                const nuevoStock = (productoActual?.stock ?? 0) - p.cantidad;
                return actualizarStock(p.id_producto ?? p.id, nuevoStock);
              }));
              // Refresca productos desde la base de datos
              const nuevosProductos = await fetchProductos(true);
              setProductos(nuevosProductos);
              vaciar();
              setCompraTotal(total);
              setCompraExitosa(true);
              setModalCompraAbierto(false);
              setComprando(false);
              setEmailCliente(""); // Limpia email tras compra
              setMetodoPago("");   // Limpia método de pago tras compra
            } catch (e) {
              showToast(e?.message ? `Error: ${e.message}` : "Error al tramitar el pedido", "error");
              setComprando(false);
            }
          }}
        >
          <input
            type="email"
            placeholder="Introduce tu correo"
            autoComplete="email"
            className="p-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white min-w-[220px]"
            value={emailCliente}
            onChange={e => setEmailCliente(e.target.value)}
            required
            aria-label="Correo electrónico"
            pattern="^[^@\s]+@[^@\s]+\.[^@\s]+$"
            onInvalid={e => e.target.setCustomValidity('Introduce un correo válido')}
            onInput={e => e.target.setCustomValidity('')}
            disabled={comprando}
          />
          <select
            className="p-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white"
            value={metodoPago}
            onChange={e => setMetodoPago(e.target.value)}
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
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              onClick={() => {
                setModalCompraAbierto(false);
                setEmailCliente("");
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
                'Comprar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}