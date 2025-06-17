import pool from '../lib/db';

// Crear un nuevo pedido y sus detalles
export async function POST(request) {
  try {
    const datos = await request.json();
    const { id_cliente, total, metodo_pago, productos } = datos;
    if (!id_cliente || !total || !metodo_pago || !Array.isArray(productos) || productos.length === 0) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 });
    }
    // Insertar pedido
    const [pedidoResult] = await pool.query(
      'INSERT INTO pedidos (id_cliente, fecha_pedido, estado, total, metodo_pago) VALUES (?, NOW(), ?, ?, ?)',
      [id_cliente, 'pendiente', total, metodo_pago]
    );
    const id_pedido = pedidoResult.insertId;
    // Insertar detalles del pedido
    for (const prod of productos) {
      await pool.query(
        'INSERT INTO detalles_pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [id_pedido, prod.id_producto, prod.cantidad, prod.precio_unitario]
      );
    }
    // Añadir puntos de fidelidad por cada 50€
    const puntos = Math.floor(total / 50) * 10;
    if (puntos > 0) {
      await pool.query(
        'UPDATE clientes SET puntos_fidelidad = IFNULL(puntos_fidelidad,0) + ? WHERE id_cliente = ?',
        [puntos, id_cliente]
      );
    }
    return new Response(JSON.stringify({ success: true, id_pedido, puntos_sumados: puntos }), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}