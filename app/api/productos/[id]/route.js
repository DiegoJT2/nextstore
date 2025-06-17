import pool from '../../lib/db';

export async function PUT(request, { params }) {
  const id = params.id;
  const datos = await request.json();
  const { nombre, precio } = datos;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Falta el id del producto.' }), { status: 400 });
  }
  try {
    // Verificar si el producto existe
    const [rows] = await pool.query('SELECT id FROM productos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Producto no encontrado.' }), { status: 404 });
    }
    // Actualizar producto
    const [result] = await pool.query(
      'UPDATE productos SET nombre = ?, precio = ? WHERE id = ?',
      [nombre, precio, id]
    );
    if (result.affectedRows > 0 && result.changedRows > 0) {
      return new Response(JSON.stringify({ success: true, message: 'Producto actualizado con éxito' }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ success: false, message: 'No se realizaron cambios en el producto' }), { status: 200 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
export async function DELETE(request, { params }) {
  const id = params.id;
  try {
    await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

