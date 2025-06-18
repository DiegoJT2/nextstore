import pool from './lib/db';
import bcrypt from 'bcryptjs';

// Registro de usuario
export async function register({ nombre, email, password }) {
  if (!nombre || !email || !password) throw new Error('Faltan campos');
  const hash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO clientes (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, hash]);
  return { success: true };
}

// Login de usuario
export async function login({ email, password }) {
  if (!email || !password) throw new Error('Faltan campos');
  const [rows] = await pool.query('SELECT * FROM clientes WHERE email = ?', [email]);
  if (!rows.length) throw new Error('Usuario no encontrado');
  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Contraseña incorrecta');
  // Aquí deberías generar un token JWT o establecer una cookie de sesión
  return { success: true, id_cliente: user.id_cliente, nombre: user.nombre, email: user.email };
}