import pool from '../lib/db';

// Obtener cliente por email o todos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (email) {
      const [rows] = await pool.query(
        'SELECT id_cliente, nombre, apellidos, email, puntos_fidelidad FROM clientes WHERE email = ?',
        [email]
      );
      if (rows.length === 0) {
        return new Response(JSON.stringify({ message: 'El correo no existe' }), { status: 200 });
      }
      return new Response(JSON.stringify(rows[0]), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    // Si no hay email, no devuelvas nada por seguridad
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

// Crear un nuevo cliente
export async function POST(request) {
  try {
    const datos = await request.json();
    const { nombre, apellidos, email } = datos;
    if (!nombre || !apellidos || !email) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400 });
    }
    await pool.query(
      'INSERT INTO clientes (nombre, apellidos, email) VALUES (?, ?, ?)',
      [nombre, apellidos, email]
    );
    return new Response(JSON.stringify({ success: true }), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}