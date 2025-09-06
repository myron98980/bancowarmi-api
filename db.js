// BancoWarmiAPI/db.js (VERSIÓN PARA PRODUCCIÓN)
import mysql from 'mysql2/promise';

// --- ¡MUY IMPORTANTE! ---
// Render inyectará la URL de conexión a tu base de datos automáticamente
// si la configuras como una "Environment Variable".
// Si no, usará los valores locales.

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Contraseña vacía para local
  database: process.env.DB_NAME || 'banco_warmi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Opciones adicionales para evitar timeouts en producción
  connectTimeout: 20000,
  acquireTimeout: 20000,
  multipleStatements: true,
});

pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a la BD establecida exitosamente.');
    connection.release(); // Libera la conexión de prueba
  })
  .catch(err => {
    console.error('❌ Error al conectar con la BD:', err.code, err.message);
  });

export default pool;
