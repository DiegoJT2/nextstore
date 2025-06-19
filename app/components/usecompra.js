export async function realizarCompra({ id_cliente, total, metodo_pago, productos }) {
  try {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_cliente, total, metodo_pago, productos }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      return { error: errorData.message || 'Error al realizar la compra' };
    }
    return await res.json();
  } catch (error) {
    return { error: error.message || 'Error en la comunicación con el servidor' };
  }
}