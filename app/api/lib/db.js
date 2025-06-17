import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then(async (connection) => {
    // Configura los tiempos de espera
    await connection.query('SET GLOBAL wait_timeout = 60;');
    await connection.query('SET GLOBAL interactive_timeout = 60;');
    connection.release();  // Liberamos la conexión
  })
  .catch(err => {
    console.error('Error al configurar tiempos de espera:', err);
  });

export default pool;