import pool from '../lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, nombre, apellidos, email, password } = body;
    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, error: 'Faltan campos' }), { status: 400 });
    }
    if (action === 'register') {
      if (!nombre || !apellidos) {
        return new Response(JSON.stringify({ success: false, error: 'Faltan nombre o apellidos' }), { status: 400 });
      }
      // Verifica si ya existe
      const [rows] = await pool.query('SELECT id_cliente FROM clientes WHERE email = ?', [email]);
      if (rows.length > 0) {
        return new Response(JSON.stringify({ success: false, error: 'El correo ya está registrado' }), { status: 400 });
      }
      const hash = await bcrypt.hash(password, 10);
      // Guarda también apellidos
      const result = await pool.query('INSERT INTO clientes (nombre, apellidos, email, password) VALUES (?, ?, ?, ?)', [nombre, apellidos, email, hash]);
      return new Response(JSON.stringify({ success: true }), { status: 201 });
    } else if (action === 'login') {
      const [rows] = await pool.query('SELECT * FROM clientes WHERE email = ?', [email]);
      if (!rows.length) {
        return new Response(JSON.stringify({ success: false, error: 'Usuario no encontrado' }), { status: 401 });
      }
      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return new Response(JSON.stringify({ success: false, error: 'Contraseña incorrecta' }), { status: 401 });
      }
      return new Response(JSON.stringify({ success: true, id_cliente: user.id_cliente, nombre: user.nombre, email: user.email }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Acción no válida' }), { status: 400 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}