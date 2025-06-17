import pool from '../../../lib/db';

export async function PUT(request, { params }) {
  const id = params.id;
  const { stock } = await request.json();
  if (!id || typeof stock !== 'number') {
    return new Response(JSON.stringify({ error: "ID y stock válidos son obligatorios" }), { status: 400 });
  }
  try {
    // Obtener el stock actual
    const [rows] = await pool.query('SELECT stock FROM productos WHERE id_producto = ?', [id]);
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Producto no encontrado" }), { status: 404 });
    }
    const stockActual = rows[0].stock;
    const nuevoStock = stockActual + stock;
    if (nuevoStock < 0) {
      return new Response(JSON.stringify({ error: "Stock insuficiente" }), { status: 400 });
    }
    await pool.query('UPDATE productos SET stock = ? WHERE id_producto = ?', [nuevoStock, id]);
    const [productoActualizado] = await pool.query('SELECT * FROM productos WHERE id_producto = ?', [id]);
    return new Response(JSON.stringify(productoActualizado[0]), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function GET(request, { params }) {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "ID requerido" }), { status: 400 });
  }
  try {
    const [rows] = await pool.query('SELECT stock FROM productos WHERE id_producto = ?', [id]);
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Producto no encontrado" }), { status: 404 });
    }
    return new Response(JSON.stringify({ stock: rows[0].stock }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}