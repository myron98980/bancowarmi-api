// server.js (ADAPTADO A TU BASE DE DATOS EN HOSTINGER)
import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const port = 3001; // Render asignará su propio puerto, pero esto es bueno para pruebas locales.

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('¡La API de Banco Warmi está funcionando!');
});

// --- ENDPOINT PARA EL DASHBOARD (CORREGIDO) ---
app.get('/dashboard/:socioId', async (req, res) => {
  const { socioId } = req.params;
  const cicloId = 1; // Asumimos que estamos en el ciclo actual (ID = 1)

  try {
    const [[membresia]] = await db.query(
      'SELECT membresia_id, cantidad_acciones FROM membresias_ciclo WHERE socio_id = ? AND ciclo_id = ?',
      [socioId, cicloId]
    );

    if (!membresia) {
      return res.status(404).json({ message: 'Socio no encontrado en el ciclo actual.' });
    }
    const { membresia_id, cantidad_acciones } = membresia;

    const [[socio]] = await db.query('SELECT nombres, apellidos FROM socios WHERE socio_id = ?', [socioId]);
    
    const [[aportes]] = await db.query('SELECT SUM(monto_aportado) as total FROM aportes WHERE membresia_id = ?', [membresia_id]);
    
    const [[multas]] = await db.query('SELECT SUM(monto_multa) as total FROM multas WHERE membresia_id = ?', [membresia_id]);
    
    const [[ultimoAporte]] = await db.query('SELECT monto_aportado as monto FROM aportes WHERE membresia_id = ? ORDER BY fecha_hora_aporte DESC LIMIT 1', [membresia_id]);

    const [movimientos] = await db.query(`
      (SELECT 'Aporte' as tipo, monto_aportado as monto, fecha_hora_aporte as fecha FROM aportes WHERE membresia_id = ?)
      UNION ALL
      (SELECT tm.descripcion as tipo, -m.monto_multa as monto, m.fecha_multa as fecha 
       FROM multas as m 
       JOIN tipos_multa as tm ON m.tipo_multa_id = tm.tipo_multa_id 
       WHERE m.membresia_id = ?)
      ORDER BY fecha DESC
      LIMIT 5;
    `, [membresia_id, membresia_id]);

    const dashboardData = {
      nombre: `${socio.nombres} ${socio.apellidos}`,
      aportesAcumulados: aportes.total || 0,
      ultimoAporte: ultimoAporte ? ultimoAporte.monto : 0,
      multasAcumuladas: multas.total || 0,
      acciones: cantidad_acciones,
      movimientos: movimientos.map(m => ({
          id: `${m.tipo}-${m.fecha.toISOString()}`, // Usamos toISOString para un ID más único
          tipo: m.tipo,
          monto: m.monto,
          fecha: new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      }))
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// --- ENDPOINT PARA EL LOGIN (CORREGIDO) ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos.' });
  }

  try {
    const [[user]] = await db.query(
      'SELECT socio_id FROM usuarios WHERE username = ? AND password_hash = SHA2(?, 256)',
      [username, password]
    );

    if (user) {
      res.json({ success: true, socioId: user.socio_id });
    } else {
      res.json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});
// --- NUEVO ENDPOINT PARA OBTENER LAS MULTAS DE UN SOCIO ---
app.get('/fines/:socioId', async (req, res) => {
  const { socioId } = req.params;
  const cicloId = 1;

  try {
    const [[membresia]] = await db.query(
      'SELECT membresia_id FROM membresias_ciclo WHERE socio_id = ? AND ciclo_id = ?',
      [socioId, cicloId]
    );

    if (!membresia) {
      // Si no hay membresía, devolvemos un objeto con total 0 y lista vacía
      return res.json({ totalFines: 0, finesList: [] });
    }

    const [fines] = await db.query(`
      SELECT m.multa_id, m.monto_multa, m.fecha_multa, tm.descripcion AS tipo_multa
      FROM multas AS m
      JOIN tipos_multa AS tm ON m.tipo_multa_id = tm.tipo_multa_id
      WHERE m.membresia_id = ?
      ORDER BY m.fecha_multa DESC;
    `, [membresia.membresia_id]);

    // --- INICIO DE LA MEJORA ---
    // Calculamos la suma total de las multas
    const totalFines = fines.reduce((sum, fine) => sum + Number(fine.monto_multa), 0);

    const formattedFines = fines.map(fine => ({
      id: fine.multa_id,
      reason: fine.tipo_multa,
      date: new Date(fine.fecha_multa).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
      amount: fine.monto_multa
    }));

    // Devolvemos un objeto que contiene tanto el total como la lista
    res.json({
      totalFines: totalFines,
      finesList: formattedFines
    });
    // --- FIN DE LA MEJORA ---

  } catch (error) {
    console.error('Error al obtener las multas:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// --- INICIAR EL SERVIDOR ---
// Render usa la variable de entorno PORT, si no existe (local), usa 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
