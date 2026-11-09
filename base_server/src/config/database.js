const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const initSQL = fs.readFileSync(
  path.join(__dirname, '../sql_scripts/init.sql'),
  'utf8'
);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Gagal konek SQLite:', err.message);
    process.exit(1);
  }
  console.log('✅ Terhubung ke SQLite:', dbPath);
});

db.run('PRAGMA foreign_keys = ON');

const execute = (sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });

const queryAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const queryGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const executeRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });

const initialServices = [
  { name: 'Cuci Kering Setrika', price: 6000, unit: 'kg' },
  { name: 'Cuci Kering Saja', price: 4500, unit: 'kg' },
  { name: 'Setrika Saja', price: 3500, unit: 'kg' },
  { name: 'Cuci Express', price: 9000, unit: 'kg' },
  { name: 'Sprei & Sarung Bantal', price: 20000, unit: 'set' },
  { name: 'Selimut', price: 20000, unit: 'buah' },
  { name: 'Bedcover', price: 30000, unit: 'buah' },
];

const migrateServices = async () => {
  const migration = await queryGet(
    'SELECT name FROM app_migrations WHERE name = ?',
    ['replace-initial-services']
  );
  if (migration) return;

  await execute('BEGIN IMMEDIATE TRANSACTION');
  try {
    const services = await queryAll('SELECT id, name, description FROM services');
    const references = await queryAll('SELECT DISTINCT service_id FROM orders');
    const referencedIds = new Set(references.map((row) => row.service_id));

    for (const service of services) {
      if (referencedIds.has(service.id)) {
        await executeRun(
          `UPDATE services
           SET name = ?, description = ?, unit = 'kg', is_active = 0
           WHERE id = ?`,
          [`Arsip - ${service.name}`, service.description || 'Layanan lama untuk riwayat pesanan.', service.id]
        );
      } else {
        await executeRun('DELETE FROM services WHERE id = ?', [service.id]);
      }
    }

    for (const service of initialServices) {
      await executeRun(
        `INSERT INTO services (name, price_per_kg, unit, estimated_days, is_active)
         VALUES (?, ?, ?, 3, 1)`,
        [service.name, service.price, service.unit]
      );
    }

    await executeRun(
      'INSERT INTO app_migrations (name) VALUES (?)',
      ['replace-initial-services']
    );
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }
};

const initializeDatabase = async () => {
  await execute(initSQL);

  const serviceColumns = await queryAll('PRAGMA table_info(services)');
  if (!serviceColumns.some((column) => column.name === 'unit')) {
    await execute(
      "ALTER TABLE services ADD COLUMN unit TEXT NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'set', 'buah'))"
    );
  }

  await migrateServices();
};


module.exports = { db, initializeDatabase };