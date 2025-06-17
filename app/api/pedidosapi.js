// Realiza una compra: crea pedido y detalles
export async function realizarCompra({ id_cliente, total, metodo_pago, productos }) {
  const res = await fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_cliente, total, metodo_pago, productos })
  });
  // Devuelve siempre el json, aunque haya error
  return res.json();
}