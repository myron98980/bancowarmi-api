// db.js
import mysql from 'mysql2/promise';

// Crea el pool de conexiones a la base de datos
const pool = mysql.createPool({
  host: 'localhost',       // O la IP de tu servidor de base de datos
  user: 'u784147396_noe56',            // Tu usuario de MySQL
  password: 'n&QoAAP33', // <-- CAMBIA ESTO por tu contraseña de MySQL
  database: 'u784147396_banco_warmi', // El nombre de tu base de datos
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('Pool de conexiones a la BD creado exitosamente.');

export default pool;