import pool from '../lib/db';

export async function GET(request) {
  // Paginación y filtros avanzados
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit')) || 12;
  const offset = parseInt(searchParams.get('offset')) || 0;
  const categoria = searchParams.get('categoria');
  const precioMin = searchParams.get('precioMin');
  const precioMax = searchParams.get('precioMax');
  const marca = searchParams.get('marca');
  const stock = searchParams.get('stock');

  // Construcción dinámica de filtros
  let where = [];
  let params = [];
  if (categoria && categoria !== '0') {
    where.push('id_categoria = ?');
    params.push(Number(categoria));
  }
  if (precioMin !== undefined && precioMin !== null && precioMin !== "" && !isNaN(Number(precioMin))) {
    where.push('precio >= ?');
    params.push(Number(precioMin));
  }
  if (precioMax !== undefined && precioMax !== null && precioMax !== "" && !isNaN(Number(precioMax))) {
    where.push('precio <= ?');
    params.push(Number(precioMax));
  }
  if (marca !== undefined && marca !== null && marca !== "") {
    where.push('LOWER(marca) LIKE ?');
    params.push(`%${marca.toLowerCase()}%`);
  }
  if (stock !== undefined && stock !== null && stock !== "" && !isNaN(Number(stock))) {
    where.push('stock >= ?');
    params.push(Number(stock));
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    // Usa consultas en paralelo para mejorar el rendimiento
    const productosPromise = pool.query(
      `SELECT * FROM productos ${whereClause} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const totalPromise = pool.query(
      `SELECT COUNT(*) as total FROM productos ${whereClause}`,
      params
    );
    const [[rows], [[{ total }]]] = await Promise.all([productosPromise, totalPromise]);
    return new Response(JSON.stringify({ productos: rows, total }), {
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