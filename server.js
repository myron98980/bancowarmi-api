// server.js
import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('¡La API de Banco Warmi está funcionando!');
});

// --- NUEVO ENDPOINT PARA EL DASHBOARD ---
app.get('/dashboard/:socioId', async (req, res) => {
  const { socioId } = req.params;
  const cicloId = 1; // Asumimos que estamos en el ciclo actual (ID = 1)

  try {
    // 1. Obtener el ID de la membresía para este socio y ciclo
    const [[membresia]] = await db.query(
      'SELECT membresia_id, cantidad_acciones FROM Membresias_Ciclo WHERE socio_id = ? AND ciclo_id = ?',
      [socioId, cicloId]
    );

    if (!membresia) {
      return res.status(404).json({ message: 'Socio no encontrado en el ciclo actual.' });
    }
    const { membresia_id, cantidad_acciones } = membresia;

    // 2. Obtener el nombre del socio
    const [[socio]] = await db.query('SELECT nombres, apellidos FROM Socios WHERE socio_id = ?', [socioId]);
    
    // 3. Calcular aportes acumulados
    const [[aportes]] = await db.query('SELECT SUM(monto_aportado) as total FROM Aportes WHERE membresia_id = ?', [membresia_id]);
    
    // 4. Calcular multas acumuladas
    const [[multas]] = await db.query('SELECT SUM(monto_multa) as total FROM Multas WHERE membresia_id = ?', [membresia_id]);
    
    // 5. Obtener el último aporte
    const [[ultimoAporte]] = await db.query('SELECT monto_aportado as monto FROM Aportes WHERE membresia_id = ? ORDER BY fecha_hora_aporte DESC LIMIT 1', [membresia_id]);

    // 6. Obtener los últimos 5 movimientos (aportes y multas)
    const [movimientos] = await db.query(`
      (SELECT 'Aporte' as tipo, monto_aportado as monto, fecha_hora_aporte as fecha FROM Aportes WHERE membresia_id = ?)
      UNION ALL
      (SELECT Tipos_Multa.descripcion as tipo, -Multas.monto_multa as monto, Multas.fecha_multa as fecha FROM Multas JOIN Tipos_Multa ON Multas.tipo_multa_id = Tipos_Multa.tipo_multa_id WHERE Multas.membresia_id = ?)
      ORDER BY fecha DESC
      LIMIT 5;
    `, [membresia_id, membresia_id]);

    // 7. Construir el objeto de respuesta
    const dashboardData = {
      nombre: `${socio.nombres} ${socio.apellidos}`,
      aportesAcumulados: aportes.total || 0,
      ultimoAporte: ultimoAporte ? ultimoAporte.monto : 0,
      multasAcumuladas: multas.total || 0,
      acciones: cantidad_acciones,
      movimientos: movimientos.map(m => ({
          id: `${m.tipo}-${m.fecha}`, // ID único para la lista
          tipo: m.tipo,
          monto: m.monto,
          fecha: new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) // Formatear fecha
      }))
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// --- NUEVO ENDPOINT PARA EL LOGIN ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos.' });
  }

  try {
    // Buscamos al usuario en la base de datos
    const [[user]] = await db.query(
      'SELECT socio_id, password_hash FROM usuarios WHERE username = ?',
      [username]
    );

    // Si el usuario no existe, enviamos un error
    if (!user) {
      return res.json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

    // Comparamos la contraseña encriptada
    const [[passwordMatch]] = await db.query(
      'SELECT ? = password_hash AS isMatch',
      [SHA2(password, 256)] // Encriptamos la contraseña que nos llegó para compararla
    );

    if (passwordMatch.isMatch) {
      // ¡Éxito! La contraseña coincide
      res.json({ success: true, socioId: user.socio_id });
    } else {
      // La contraseña no coincide
      res.json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});


app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
