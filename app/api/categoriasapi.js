// Devuelve la lista de categorías desde la API
export async function fetchCategorias() {
  const res = await fetch('/api/categorias');
  if (!res.ok) throw new Error('Error al obtener categorías');
  return res.json();
}