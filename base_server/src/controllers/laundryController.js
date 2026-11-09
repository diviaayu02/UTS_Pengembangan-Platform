const model = require('../models/laundryModel');

const statuses = ['baru', 'diproses', 'selesai', 'diambil', 'batal'];
const serviceUnits = ['kg', 'set', 'buah'];
const success = (res, code, message, data = null) =>
  res.status(code).json({ success: true, message, data });
const fail = (res, code, message, error = null) =>
  res.status(code).json({ success: false, message, error });
const isPositiveId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const isValidPrice = (value) =>
  value !== '' && value !== null && Number.isFinite(Number(value)) && Number(value) >= 0;

const handleError = (res, error) => {
  console.error('[laundry API]', error);
  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
      (error.code === 'SQLITE_CONSTRAINT' && /FOREIGN KEY/i.test(error.message))) {
    return fail(res, 409, 'Data tidak dapat dihapus karena masih digunakan pesanan');
  }
  return fail(res, 500, 'Terjadi kesalahan pada server');
};

const listCustomers = async (req, res) => {
  try { success(res, 200, 'Daftar pelanggan', await model.findAllCustomers()); }
  catch (error) { handleError(res, error); }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await model.findCustomerById(req.params.id);
    if (!customer) return fail(res, 404, 'Pelanggan tidak ditemukan');
    success(res, 200, 'Detail pelanggan', customer);
  } catch (error) { handleError(res, error); }
};

const saveCustomer = async (req, res) => {
  const { name, phone } = req.body;
  if (typeof name !== 'string' || !name.trim()) return fail(res, 400, 'Nama pelanggan wajib diisi');
  if (typeof phone !== 'string' || !phone.trim()) return fail(res, 400, 'Nomor telepon wajib diisi');
  try {
    const customer = req.params.id
      ? await model.updateCustomer(req.params.id, { ...req.body, name: name.trim(), phone: phone.trim() })
      : await model.createCustomer({ ...req.body, name: name.trim(), phone: phone.trim() });
    if (!customer) return fail(res, 404, 'Pelanggan tidak ditemukan');
    success(res, req.params.id ? 200 : 201, 'Pelanggan berhasil disimpan', customer);
  } catch (error) { handleError(res, error); }
};

const removeCustomer = async (req, res) => {
  try {
    const deleted = await model.deleteCustomer(req.params.id);
    if (!deleted) return fail(res, 404, 'Pelanggan tidak ditemukan');
    success(res, 200, 'Pelanggan berhasil dihapus');
  } catch (error) { handleError(res, error); }
};

const listServices = async (req, res) => {
  try { success(res, 200, 'Daftar layanan', await model.findAllServices()); }
  catch (error) { handleError(res, error); }
};

const getService = async (req, res) => {
  try {
    const service = await model.findServiceById(req.params.id);
    if (!service) return fail(res, 404, 'Layanan tidak ditemukan');
    success(res, 200, 'Detail layanan', service);
  } catch (error) { handleError(res, error); }
};

const saveService = async (req, res) => {
  const { name, price_per_kg, estimated_days, unit } = req.body;
  if (typeof name !== 'string' || !name.trim()) return fail(res, 400, 'Nama layanan wajib diisi');
  if (!isValidPrice(price_per_kg)) return fail(res, 400, 'Tarif layanan harus berupa angka minimal 0');
  if (unit !== undefined && !serviceUnits.includes(unit)) {
    return fail(res, 400, `Satuan harus salah satu dari: ${serviceUnits.join(', ')}`);
  }
  if (estimated_days !== undefined && (!Number.isInteger(Number(estimated_days)) || Number(estimated_days) < 1)) {
    return fail(res, 400, 'Estimasi hari harus berupa bilangan bulat minimal 1');
  }
  try {
    const service = req.params.id
      ? await model.updateService(req.params.id, { ...req.body, name: name.trim() })
      : await model.createService({ ...req.body, name: name.trim(), price_per_kg: Number(price_per_kg) });
    if (!service) return fail(res, 404, 'Layanan tidak ditemukan');
    success(res, req.params.id ? 200 : 201, 'Layanan berhasil disimpan', service);
  } catch (error) { handleError(res, error); }
};

const removeService = async (req, res) => {
  try {
    const deleted = await model.deleteService(req.params.id);
    if (!deleted) return fail(res, 404, 'Layanan tidak ditemukan');
    success(res, 200, 'Layanan berhasil dihapus');
  } catch (error) { handleError(res, error); }
};

const listOrders = async (req, res) => {
  try { success(res, 200, 'Daftar pesanan', await model.findAllOrders()); }
  catch (error) { handleError(res, error); }
};

const getOrder = async (req, res) => {
  try {
    const order = await model.findOrderById(req.params.id);
    if (!order) return fail(res, 404, 'Pesanan tidak ditemukan');
    success(res, 200, 'Detail pesanan', order);
  } catch (error) { handleError(res, error); }
};

const saveOrder = async (req, res) => {
  const { customer_id, service_id, weight, status } = req.body;
  if (!req.params.id && (!isPositiveId(customer_id) || !isPositiveId(service_id))) {
    return fail(res, 400, 'Pelanggan dan layanan harus dipilih');
  }
  if (!req.params.id && (!Number.isFinite(Number(weight)) || Number(weight) <= 0)) {
    return fail(res, 400, 'Berat harus berupa angka lebih dari 0');
  }
  if (status !== undefined && !statuses.includes(status)) {
    return fail(res, 400, `Status harus salah satu dari: ${statuses.join(', ')}`);
  }
  try {
    const current = req.params.id ? await model.findOrderById(req.params.id) : null;
    if (req.params.id && !current) return fail(res, 404, 'Pesanan tidak ditemukan');

    const customerId = Number(customer_id ?? current?.customer_id);
    const serviceId = Number(service_id ?? current?.service_id);
    const orderWeight = Number(weight ?? current?.weight);
    if (!isPositiveId(customerId) || !isPositiveId(serviceId)) return fail(res, 400, 'Pelanggan dan layanan harus dipilih');
    if (!Number.isFinite(orderWeight) || orderWeight <= 0) return fail(res, 400, 'Berat harus berupa angka lebih dari 0');
    const customer = await model.findCustomerById(customerId);
    const service = await model.findServiceById(serviceId);
    if (!customer) return fail(res, 400, 'Pelanggan tidak ditemukan');
    if (!service) return fail(res, 400, 'Layanan tidak ditemukan');
    if (service.unit !== 'kg' && !Number.isInteger(orderWeight)) {
      return fail(res, 400, `Jumlah ${service.unit} harus berupa bilangan bulat`);
    }

    const payload = { ...req.body, customer_id: customerId, service_id: serviceId, weight: orderWeight };
    const order = req.params.id
      ? await model.updateOrder(req.params.id, payload, service.price_per_kg)
      : await model.createOrder(payload, service.price_per_kg);
    success(res, req.params.id ? 200 : 201, 'Pesanan berhasil disimpan', order);
  } catch (error) { handleError(res, error); }
};

const removeOrder = async (req, res) => {
  try {
    const deleted = await model.deleteOrder(req.params.id);
    if (!deleted) return fail(res, 404, 'Pesanan tidak ditemukan');
    success(res, 200, 'Pesanan berhasil dihapus');
  } catch (error) { handleError(res, error); }
};

module.exports = {
  listCustomers, getCustomer, createCustomer: saveCustomer, updateCustomer: saveCustomer, removeCustomer,
  listServices, getService, createService: saveService, updateService: saveService, removeService,
  listOrders, getOrder, createOrder: saveOrder, updateOrder: saveOrder, removeOrder,
};