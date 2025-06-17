import pool from '../lib/db';

export async function GET(request) {
  try {
    const [rows] = await pool.query('SELECT * FROM productos');
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  const datos = await request.json();
  const { nombre, descripcion, precio, stock, categoria, marca, imagen } = datos;
  // Validación básica de parámetros
  if (!nombre || !precio || stock == null) {
    return new Response(JSON.stringify({ error: "Faltan campos obligatorios" }), { status: 400 });
  }
  try {
    await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, stock, id_categoria, marca, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, precio, stock, categoria, marca, imagen]
    );
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (error) {
    // No expongas detalles internos en producción
    return new Response(JSON.stringify({ error: "Error interno al crear producto" }), { status: 500 });
  }
}