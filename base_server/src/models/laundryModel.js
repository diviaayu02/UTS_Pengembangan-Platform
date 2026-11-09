const { dbRun, dbGet, dbAll } = require('../middlewares_helpers/sqlite3_helpers');

const findAllCustomers = () =>
  dbAll('SELECT * FROM customers ORDER BY id DESC');

const findCustomerById = (id) =>
  dbGet('SELECT * FROM customers WHERE id = ?', [id]);

const createCustomer = async ({ name, phone, address }) => {
  const { lastID } = await dbRun(
    'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)',
    [name, phone, address || null]
  );
  return findCustomerById(lastID);
};

const updateCustomer = async (id, body) => {
  const current = await findCustomerById(id);
  if (!current) return null;

  await dbRun(
    'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?',
    [body.name ?? current.name, body.phone ?? current.phone,
      body.address ?? current.address, id]
  );
  return findCustomerById(id);
};

const deleteCustomer = async (id) => {
  const { changes } = await dbRun('DELETE FROM customers WHERE id = ?', [id]);
  return changes > 0;
};

const findAllServices = () =>
  dbAll('SELECT * FROM services ORDER BY id DESC');

const findServiceById = (id) =>
  dbGet('SELECT * FROM services WHERE id = ?', [id]);

const createService = async ({ name, description, price_per_kg, unit, estimated_days, is_active }) => {
  const { lastID } = await dbRun(
    `INSERT INTO services (name, description, price_per_kg, unit, estimated_days, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description || null, price_per_kg, unit || 'kg', estimated_days ?? 3,
      is_active === undefined ? 1 : Number(Boolean(is_active))]
  );
  return findServiceById(lastID);
};

const updateService = async (id, body) => {
  const current = await findServiceById(id);
  if (!current) return null;

  await dbRun(
    `UPDATE services
     SET name = ?, description = ?, price_per_kg = ?, unit = ?, estimated_days = ?, is_active = ?
     WHERE id = ?`,
    [body.name ?? current.name, body.description ?? current.description,
      body.price_per_kg ?? current.price_per_kg,
      body.unit ?? current.unit,
      body.estimated_days ?? current.estimated_days,
      body.is_active === undefined ? current.is_active : Number(Boolean(body.is_active)), id]
  );
  return findServiceById(id);
};

const deleteService = async (id) => {
  const { changes } = await dbRun('DELETE FROM services WHERE id = ?', [id]);
  return changes > 0;
};

const orderSelect = `
  SELECT orders.*, customers.name AS customer_name, customers.phone AS customer_phone,
         services.name AS service_name, services.price_per_kg, services.unit
  FROM orders
  JOIN customers ON customers.id = orders.customer_id
  JOIN services ON services.id = orders.service_id
`;

const findAllOrders = () =>
  dbAll(`${orderSelect} ORDER BY orders.created_at DESC, orders.id DESC`);

const findOrderById = (id) =>
  dbGet(`${orderSelect} WHERE orders.id = ?`, [id]);

const createOrder = async ({ customer_id, service_id, weight, status, notes }, price_per_kg) => {
  const totalPrice = Math.round(Number(weight) * price_per_kg * 100) / 100;
  const { lastID } = await dbRun(
    `INSERT INTO orders (customer_id, service_id, weight, total_price, status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [customer_id, service_id, weight, totalPrice, status || 'baru', notes || null]
  );
  return findOrderById(lastID);
};

const updateOrder = async (id, body, price_per_kg) => {
  const current = await findOrderById(id);
  if (!current) return null;

  const weight = body.weight ?? current.weight;
  const totalPrice = Math.round(Number(weight) * price_per_kg * 100) / 100;
  await dbRun(
    `UPDATE orders
     SET customer_id = ?, service_id = ?, weight = ?, total_price = ?,
         status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [body.customer_id ?? current.customer_id, body.service_id ?? current.service_id,
      weight, totalPrice, body.status ?? current.status,
      body.notes ?? current.notes, id]
  );
  return findOrderById(id);
};

const deleteOrder = async (id) => {
  const { changes } = await dbRun('DELETE FROM orders WHERE id = ?', [id]);
  return changes > 0;
};

module.exports = {
  findAllCustomers, findCustomerById, createCustomer, updateCustomer, deleteCustomer,
  findAllServices, findServiceById, createService, updateService, deleteService,
  findAllOrders, findOrderById, createOrder, updateOrder, deleteOrder,
};