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
      [id_cliente, 'pending', total, metodo_pago]
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

// Obtener historial de compras de un cliente
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400 });
  }
  try {
    // Busca el id_cliente por email
    const [clientes] = await pool.query('SELECT id_cliente FROM clientes WHERE email = ?', [email]);
    if (!clientes.length) {
      return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 });
    }
    const id_cliente = clientes[0].id_cliente;
    // Obtiene los pedidos y detalles agrupados (usa índices y JOIN optimizado)
    const [rows] = await pool.query(
      `SELECT 
        p.id_pedido, p.fecha_pedido, p.total, p.metodo_pago, p.estado,
        dp.id_producto, dp.cantidad, dp.precio_unitario
      FROM pedidos p
      JOIN detalles_pedido dp ON p.id_pedido = dp.id_pedido
      WHERE p.id_cliente = ?
      ORDER BY p.fecha_pedido DESC, p.id_pedido DESC`,
      [id_cliente]
    );
    // Agrupa por pedido
    const pedidosMap = new Map();
    for (const row of rows) {
      if (!pedidosMap.has(row.id_pedido)) {
        pedidosMap.set(row.id_pedido, {
          id_pedido: row.id_pedido,
          fecha_pedido: row.fecha_pedido,
          total: row.total,
          metodo_pago: row.metodo_pago,
          estado: row.estado,
          productos: []
        });
      }
      pedidosMap.get(row.id_pedido).productos.push({
        id_producto: row.id_producto,
        cantidad: row.cantidad,
        precio_unitario: row.precio_unitario
      });
    }
    const pedidos = Array.from(pedidosMap.values());
    return new Response(JSON.stringify({ pedidos }), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
}