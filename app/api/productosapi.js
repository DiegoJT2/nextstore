// Cache simple en memoria
let productosCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 30; // 30 segundos

export async function fetchProductos(force = false) {
  if (!force && productosCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return productosCache;
  }
  const res = await fetch('/api/productos');
  if (!res.ok) throw new Error(await parseError(res, 'Error al obtener productos'));
  const data = await res.json();
  productosCache = data;
  cacheTimestamp = Date.now();
  return data;
}

export async function crearProducto(producto) {
  if (!producto || !producto.nombre || !producto.precio) {
    throw new Error("Producto inválido");
  }
  const res = await fetch('/api/productos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(producto)
  });
  if (!res.ok) throw new Error(await parseError(res, 'Error al crear producto'));
  return res.json();
}

export async function actualizarProducto(id, datos) {
  if (!id) throw new Error("ID requerido");
  const res = await fetch(`/api/productos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  if (!res.ok) throw new Error(await parseError(res, 'Error al actualizar producto'));
  return res.json();
}

export async function actualizarStock(id, stock) {
  if (!id) throw new Error("ID requerido");
  if (typeof stock !== "number") throw new Error("Stock inválido");
  const res = await fetch(`/api/productos/${id}/stock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock })
  });
  if (!res.ok) throw new Error(await parseError(res, 'Error al actualizar stock'));
  return res.json();
}

export async function eliminarProducto(id) {
  if (!id) throw new Error("ID requerido");
  const res = await fetch(`/api/productos/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(await parseError(res, 'Error al eliminar producto'));
  return res.json();
}

// Manejo de errores más detallado
async function parseError(res, defaultMsg) {
  try {
    const data = await res.json();
    return data?.error || defaultMsg;
  } catch {
    return defaultMsg;
  }
}

export function limpiarCacheProductos() {
  productosCache = null;
  cacheTimestamp = 0;
}