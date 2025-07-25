import Image from "next/image";

export default function ProductoItem({ producto, enCarrito = false, cantidad = 1, onAdd, onRemove, onChangeCantidad }) {
  return (
    <div className={`flex items-center gap-2 ${enCarrito ? "mb-2" : "flex-col bg-white dark:bg-gray-700 rounded shadow p-4 transition hover:scale-105"}`}>
      <Image
        src={
          producto.imagen && producto.imagen.trim() !== ""
            ? `/img/${producto.imagen}`
            : "/img/default.webp"
        }
        alt={producto.nombre}
        width={enCarrito ? 40 : 180}
        height={enCarrito ? 40 : 120}
        className={enCarrito ? "rounded" : "rounded mb-2"}
        style={{
          width: enCarrito ? 40 : 180,
          height: enCarrito ? 40 : 120,
          objectFit: "contain"
        }}
        priority={!enCarrito}
      />
      <div className={enCarrito ? "flex-1" : "w-full flex flex-col items-center"}>
        <h3 className={enCarrito ? "" : "font-semibold text-lg"}>{producto.nombre}</h3>
        {producto.descripcion && !enCarrito && (
          <p className="text-gray-600 dark:text-gray-300">{producto.descripcion}</p>
        )}
        <p className="font-bold mb-2">{producto.precio}€</p>
        {enCarrito ? (
          <div className="flex items-center gap-2">
            <button
              className="btn-modal-cancel"
              aria-label={`Disminuir cantidad de ${producto.nombre}`}
              onClick={onChangeCantidad ? () => onChangeCantidad(-1) : undefined}
              disabled={cantidad === 1}
              style={cantidad === 1 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              -
            </button>
            <span>{cantidad}</span>
            <button
              className="btn-modal-cancel"
              aria-label={`Aumentar cantidad de ${producto.nombre}`}
              onClick={onChangeCantidad ? () => onChangeCantidad(1) : undefined}
            >
              +
            </button>
            <span className="font-bold">{(producto.precio * cantidad).toFixed(2)}€</span>
            <button
              className="ml-2 btn-modal-confirm"
              aria-label={`Eliminar ${producto.nombre} del carrito`}
              onClick={onRemove}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={onAdd}
            aria-label={`Añadir ${producto.nombre} al carrito`}
          >
            Añadir al carrito
          </button>
        )}
      </div>
    </div>
  );
}