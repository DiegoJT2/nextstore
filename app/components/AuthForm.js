import React, { useState } from "react";

export default function AuthForm({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isLogin ? "login" : "register",
          nombre: isLogin ? undefined : nombre,
          apellidos: isLogin ? undefined : apellidos,
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Error de autenticación");
      onAuth(data);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <form className="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-sm mx-auto mt-8" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-4 text-blue-600">{isLogin ? "Iniciar sesión" : "Registrarse"}</h2>
      {!isLogin && (
        <>
          <input
            type="text"
            placeholder="Nombre"
            className="mb-2 p-2 rounded border border-gray-300 w-full"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Apellidos"
            className="mb-2 p-2 rounded border border-gray-300 w-full"
            value={apellidos}
            onChange={e => setApellidos(e.target.value)}
            required
          />
        </>
      )}
      <input
        type="email"
        placeholder="Correo electrónico"
        className="mb-2 p-2 rounded border border-gray-300 w-full"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        className="mb-4 p-2 rounded border border-gray-300 w-full"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-bold mb-2">
        {isLogin ? "Entrar" : "Registrarse"}
      </button>
      <button type="button" className="w-full text-blue-600 underline" onClick={() => setIsLogin(v => !v)}>
        {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
      </button>
    </form>
  );
}