require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, query } = require('../servers/database');
const { encrypt } = require('../security/crypto');

const DEMO_EMAIL = 'admin@umbrafiction.example';
const DEMO_PASSWORD = 'VaultDemo!2026';

async function seedDemo() {
  const existing = await query('SELECT id FROM users WHERE email=$1', [DEMO_EMAIL]);
  if (existing.rows[0]) {
    console.log('Demo user already exists.');
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await query(
    "INSERT INTO users(email,name,password_hash,role,phone_encrypted) VALUES($1,$2,$3,'admin',$4) RETURNING id",
    [DEMO_EMAIL, 'Directora Umbra', passwordHash, encrypt('8888-1234')]
  );
  const ownerId = user.rows[0].id;
  const notes = [
    ['Incidente subnivel 9', 'El alien que vive debajo del edificio está trabajando mal: dejó tres portales abiertos y perdió la llave del hangar lunar.'],
    ['Identidad de la CEO', 'La CEO de Umbra S.A. es realmente la persona de limpieza; trabaja encubierta para evaluar quién trata bien al personal.'],
    ['Máquina de café', 'La máquina de café es un oráculo contractual. Solo predice el futuro los martes, pero exige galletas de avena.']
  ];
  for (const [title, content] of notes) {
    await query('INSERT INTO notes(owner_id,title,content_encrypted) VALUES($1,$2,$3)', [ownerId, title, encrypt(content)]);
  }
  console.log('Demo user created.');
}

seedDemo().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
