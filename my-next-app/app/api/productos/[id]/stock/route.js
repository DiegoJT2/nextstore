export async function PUT(request, { params }) {
  const id = params.id;
  const { cantidad } = await request.json();
  if (!id || cantidad == null) {
    return new Response(JSON.stringify({ error: "ID y cantidad son obligatorios" }), { status: 400 });
  }
  try {
    // Obtener el stock actual
    const [rows] = await pool.query('SELECT stock FROM productos WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Producto no encontrado" }), { status: 404 });
    }
    const stockActual = rows[0].stock;
    const nuevoStock = stockActual + cantidad;
    if (nuevoStock < 0) {
      return new Response(JSON.stringify({ error: "Stock insuficiente" }), { status: 400 });
    }
    await pool.query('UPDATE productos SET stock = ? WHERE id = ?', [nuevoStock, id]);
    return new Response(JSON.stringify({ success: true, nuevoStock }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error interno al actualizar stock" }), { status: 500 });
  }
}