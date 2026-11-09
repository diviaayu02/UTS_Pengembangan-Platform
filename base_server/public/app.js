const api = '/api/laundry';
const state = { view: 'orders', customers: [], services: [], orders: [], editingId: null };
const statusNames = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai', diambil: 'Diambil', batal: 'Batal' };
const viewCopy = {
  orders: { title: 'Pesanan', description: 'Pantau cucian yang masuk sampai siap dijemput.', action: 'Pesanan baru', empty: 'Belum ada pesanan', emptyCopy: 'Catat pesanan pertama untuk mulai mengelola cucian.' },
  customers: { title: 'Pelanggan', description: 'Simpan kontak pelanggan dan riwayat layanan mereka.', action: 'Pelanggan baru', empty: 'Belum ada pelanggan', emptyCopy: 'Tambahkan pelanggan agar pesanan dapat dicatat.' },
  services: { title: 'Layanan', description: 'Atur jenis perawatan, tarif, dan estimasi pengerjaan.', action: 'Layanan baru', empty: 'Belum ada layanan', emptyCopy: 'Tambahkan layanan agar dapat dipilih pada pesanan.' },
};
const formTemplates = {
  customers: [
    ['name', 'Nama pelanggan', 'text', true, 'ct-name'],
    ['phone', 'Nomor telepon', 'tel', true, 'ct-phone'],
    ['address', 'Alamat', 'textarea', false, 'ct-address', true],
  ],
  services: [
    ['name', 'Nama layanan', 'text', true, 'sv-name'],
    ['price_per_kg', 'Tarif per satuan (Rp)', 'number', true, 'sv-price'],
    ['unit', 'Satuan tarif', 'select-unit', true, 'sv-unit'],
    ['estimated_days', 'Estimasi (hari)', 'number', true, 'sv-days'],
    ['description', 'Deskripsi', 'textarea', false, 'sv-description', true],
    ['is_active', 'Layanan aktif', 'checkbox', false, 'sv-active', true],
  ],
  orders: [
    ['customer_id', 'Pelanggan', 'select-customer', true, 'or-customer'],
    ['service_id', 'Layanan', 'select-service', true, 'or-service'],
    ['weight', 'Berat (kg)', 'number', true, 'or-weight'],
    ['status', 'Status', 'select-status', true, 'or-status'],
    ['notes', 'Catatan pesanan', 'textarea', false, 'or-notes', true],
  ],
};

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const byId = (id) => document.getElementById(id);

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Permintaan gagal');
  return result.data;
}

async function loadData() {
  try {
    [state.customers, state.services, state.orders] = await Promise.all([
      request('/customers'), request('/services'), request('/orders'),
    ]);
    render();
  } catch (error) {
    showToast(error.message || 'Tidak dapat terhubung ke API', true);
    byId('table-head').innerHTML = '';
    byId('table-body').innerHTML = '<tr><td colspan="8">Gagal memuat data dari server.</td></tr>';
  }
}

function renderMetrics() {
  byId('metric-active').textContent = state.orders.filter((order) => !['diambil', 'batal'].includes(order.status)).length;
  byId('metric-customers').textContent = state.customers.length;
  byId('metric-ready').textContent = state.orders.filter((order) => order.status === 'selesai').length;
  byId('count-orders').textContent = state.orders.length;
  byId('count-customers').textContent = state.customers.length;
  byId('count-services').textContent = state.services.length;
}

function render() {
  renderMetrics();
  const copy = viewCopy[state.view];
  byId('page-title').innerHTML = `${copy.title}<span>.</span>`;
  byId('page-description').textContent = copy.description;
  byId('add-label').textContent = copy.action;
  byId('empty-title').textContent = copy.empty;
  byId('empty-copy').textContent = copy.emptyCopy;
  byId('eyebrow').innerHTML = `${state.view === 'orders' ? 'PUSAT OPERASIONAL' : copy.title.toUpperCase()} <span>·</span> HARI INI`;
  byId('status-filter').hidden = state.view !== 'orders';
  document.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === state.view;
    button.classList.toggle('active', active);
    if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active));
  });
  renderTable();
}

function renderTable() {
  const query = byId('search-input').value.trim().toLowerCase();
  const status = byId('status-filter').value;
  const schemas = {
    orders: {
      headings: ['KODE', 'PELANGGAN', 'LAYANAN', 'JUMLAH', 'TOTAL', 'STATUS', 'CATATAN', 'WAKTU', ''],
      rows: state.orders.filter((item) => (!status || item.status === status) && `${item.id} ${item.customer_name} ${item.customer_phone} ${item.service_name} ${item.status}`.toLowerCase().includes(query)).map((item) => `
        <tr><td><span class="order-code">#LD-${String(item.id).padStart(4, '0')}</span></td>
        <td><strong>${escapeHTML(item.customer_name)}</strong><span class="subline">${escapeHTML(item.customer_phone)}</span></td>
        <td>${escapeHTML(item.service_name)}<span class="subline">${money(item.price_per_kg)} / ${escapeHTML(item.unit)}</span></td>
        <td>${Number(item.weight).toLocaleString('id-ID')} ${escapeHTML(item.unit)}</td><td><strong>${money(item.total_price)}</strong></td>
        <td><span class="status status-${escapeHTML(item.status)}">${statusNames[item.status] || escapeHTML(item.status)}</span></td>
        <td>${escapeHTML(item.notes || '—')}</td><td>${formatDate(item.created_at)}</td>${actionsCell(item.id)}</tr>`),
    },
    customers: {
      headings: ['NAMA PELANGGAN', 'TELEPON', 'ALAMAT', 'TERDAFTAR', ''],
      rows: state.customers.filter((item) => `${item.name} ${item.phone} ${item.address || ''}`.toLowerCase().includes(query)).map((item) => `
        <tr><td><strong>${escapeHTML(item.name)}</strong></td><td>${escapeHTML(item.phone)}</td>
        <td>${escapeHTML(item.address || '—')}</td><td>${formatDate(item.created_at)}</td>${actionsCell(item.id)}</tr>`),
    },
    services: {
      headings: ['NAMA LAYANAN', 'TARIF / SATUAN', 'ESTIMASI', 'STATUS', ''],
      rows: state.services.filter((item) => `${item.name} ${item.description || ''}`.toLowerCase().includes(query)).map((item) => `
        <tr><td><strong>${escapeHTML(item.name)}</strong><span class="subline">${escapeHTML(item.description || '')}</span></td>
        <td>${money(item.price_per_kg)} / ${escapeHTML(item.unit)}</td><td>${item.estimated_days} hari</td>
        <td><span class="status ${item.is_active ? 'status-selesai' : 'status-batal'}">${item.is_active ? 'Aktif' : 'Nonaktif'}</span></td>${actionsCell(item.id)}</tr>`),
    },
  };
  const schema = schemas[state.view];
  byId('table-head').innerHTML = `<tr>${schema.headings.map((heading) => `<th>${heading}</th>`).join('')}</tr>`;
  byId('table-body').innerHTML = schema.rows.join('');
  byId('empty-state').hidden = schema.rows.length > 0;
  byId('result-count').textContent = `Menampilkan ${schema.rows.length} ${state.view === 'orders' ? 'pesanan' : state.view === 'customers' ? 'pelanggan' : 'layanan'}`;
}

function actionsCell(id) {
  return `<td><div class="row-actions"><button class="text-action" data-action="edit" data-id="${id}">Ubah</button><button class="text-action delete" data-action="delete" data-id="${id}">Hapus</button></div></td>`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? escapeHTML(value) : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function fieldMarkup([name, label, type, required, id, full]) {
  const className = `field${full ? ' full' : ''}`;
  const requiredAttr = required ? 'required' : '';
  if (type === 'textarea') return `<label class="${className}" for="${id}">${label}<textarea id="${id}" name="${name}" ${requiredAttr}></textarea></label>`;
  if (type === 'checkbox') return `<label class="checkbox-field field full"><input id="${id}" name="${name}" type="checkbox" checked> ${label}</label>`;
  if (type === 'select-status') return `<label class="${className}" for="${id}">${label}<select id="${id}" name="${name}" ${requiredAttr}>${Object.entries(statusNames).map(([key, title]) => `<option value="${key}">${title}</option>`).join('')}</select></label>`;
  if (type === 'select-unit') return `<label class="${className}" for="${id}">${label}<select id="${id}" name="${name}" ${requiredAttr}><option value="kg">Kilogram (kg)</option><option value="set">Set</option><option value="buah">Buah</option></select></label>`;
  if (type === 'select-customer' || type === 'select-service') {
    const editingOrder = state.editingId && state.view === 'orders'
      ? state.orders.find((item) => item.id === Number(state.editingId))
      : null;
    const options = type === 'select-customer'
      ? state.customers.map((item) => [item.id, `${item.name} · ${item.phone}`])
      : state.services.filter((item) => item.is_active || item.id === editingOrder?.service_id)
        .sort((first, second) => first.id - second.id)
        .map((item) => [item.id, `${item.name} · ${money(item.price_per_kg)}/${item.unit}`]);
    return `<label class="${className}" for="${id}">${label}<select id="${id}" name="${name}" ${requiredAttr}><option value="">Pilih ${label.toLowerCase()}</option>${options.map(([value, title]) => `<option value="${value}">${escapeHTML(title)}</option>`).join('')}</select></label>`;
  }
  const numeric = type === 'number';
  let min = '0';
  let step = '1';
  if (name === 'weight') {
    min = '0.1';
    step = '0.1';
  } else if (name === 'estimated_days') {
    min = '1';
    step = '1';
  }
  const numericAttrs = numeric ? `min="${min}" step="${step}" inputmode="numeric" pattern="[0-9]*"` : '';
  const fieldLabel = name === 'weight' ? `<span id="or-weight-label">${label}</span>` : label;
  return `<label class="${className}" for="${id}">${fieldLabel}<input id="${id}" name="${name}" type="${type}" ${numeric ? numericAttrs : ''} ${requiredAttr}></label>`;
}

function updateOrderQuantityField() {
  const serviceSelect = byId('or-service');
  const quantityInput = byId('or-weight');
  const quantityLabel = byId('or-weight-label');
  if (!serviceSelect || !quantityInput || !quantityLabel) return;

  const service = state.services.find((item) => item.id === Number(serviceSelect.value));
  if (!service) {
    quantityLabel.textContent = 'Berat / jumlah';
    quantityInput.min = '0.1';
    quantityInput.step = '0.1';
    return;
  }

  quantityLabel.textContent = service.unit === 'kg' ? 'Berat (kg)' : `Jumlah (${service.unit})`;
  quantityInput.min = service.unit === 'kg' ? '0.1' : '1';
  quantityInput.step = service.unit === 'kg' ? '0.1' : '1';
}

function openForm(id = null) {
  if (state.view === 'orders' && (!state.customers.length || !state.services.some((item) => item.is_active))) {
    showToast('Tambahkan setidaknya satu pelanggan dan satu layanan aktif terlebih dahulu.', true);
    return;
  }
  state.editingId = id;
  const record = id ? state[state.view].find((item) => item.id === Number(id)) : null;
  byId('dialog-eyebrow').textContent = `${record ? 'UBAH' : 'DATA BARU'} · ${state.view.toUpperCase()}`;
  byId('dialog-title').textContent = `${record ? 'Ubah' : 'Buat'} ${state.view === 'orders' ? 'pesanan' : state.view === 'customers' ? 'pelanggan' : 'layanan'}`;
  byId('save-button').textContent = record ? 'Simpan perubahan' : 'Simpan data';
  byId('form-fields').innerHTML = formTemplates[state.view].map(fieldMarkup).join('');
  if (record) {
    for (const [name] of formTemplates[state.view]) {
      const input = byId(formTemplates[state.view].find((field) => field[0] === name)[4]);
      if (input.type === 'checkbox') input.checked = Boolean(record[name]);
      else if (input) input.value = record[name] ?? '';
    }
  }
  updateOrderQuantityField();
  byId('record-dialog').showModal();
}

async function saveRecord(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  for (const key of ['price_per_kg', 'estimated_days', 'customer_id', 'service_id', 'weight']) {
    if (payload[key] !== undefined) payload[key] = Number(payload[key]);
  }
  if (state.view === 'services') payload.is_active = formData.has('is_active');
  try {
    const path = `/${state.view}${state.editingId ? `/${state.editingId}` : ''}`;
    await request(path, { method: state.editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    byId('record-dialog').close();
    showToast(state.editingId ? 'Perubahan berhasil disimpan.' : 'Data baru berhasil ditambahkan.');
    await loadData();
  } catch (error) { showToast(error.message, true); }
}

async function deleteRecord(id) {
  const record = state[state.view].find((item) => item.id === Number(id));
  const name = record?.name || `pesanan #LD-${String(id).padStart(4, '0')}`;
  if (!window.confirm(`Hapus ${name}? Tindakan ini tidak dapat dibatalkan.`)) return;
  try {
    await request(`/${state.view}/${id}`, { method: 'DELETE' });
    showToast('Data berhasil dihapus.');
    await loadData();
  } catch (error) { showToast(error.message, true); }
}

let toastTimer;
function showToast(message, isError = false) {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  state.view = button.dataset.view;
  byId('search-input').value = '';
  byId('status-filter').value = '';
  render();
}));
byId('add-button').addEventListener('click', () => openForm());
byId('close-dialog').addEventListener('click', () => byId('record-dialog').close());
byId('cancel-dialog').addEventListener('click', () => byId('record-dialog').close());
byId('record-form').addEventListener('submit', saveRecord);
byId('form-fields').addEventListener('change', (event) => {
  if (event.target.id === 'or-service') updateOrderQuantityField();
});
byId('search-input').addEventListener('input', renderTable);
byId('status-filter').addEventListener('change', renderTable);
byId('table-body').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'edit') openForm(button.dataset.id);
  if (button.dataset.action === 'delete') deleteRecord(button.dataset.id);
});
byId('today').textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
loadData();