/* =====================================================
   ADMIN DASHBOARD – ABANG KUCING
   - Analytics
   - Bookings management with pagination
   - Customer list with pagination
   ===================================================== */

const ITEMS_PER_PAGE = 10;

let allBookings = [];
let allCustomers = [];
let bookingsPage = 1;
let customersPage = 1;

// DOM Elements
const totalBookingEl = document.getElementById('totalBooking');
const totalSalesEl = document.getElementById('totalSales');
const todayBookingEl = document.getElementById('todayBooking');
const totalCustomersEl = document.getElementById('totalCustomers');
const bookingsListEl = document.getElementById('bookingsList');
const customersListEl = document.getElementById('customersList');
const statusFilterEl = document.getElementById('statusFilter');
const bookingSearchEl = document.getElementById('bookingSearch');
const customerSearchEl = document.getElementById('customerSearch');
const tabButtons = document.querySelectorAll('.ak-admin-tab');
const bookingsTab = document.getElementById('bookingsTab');
const customersTab = document.getElementById('customersTab');
const settingsTab = document.getElementById('settingsTab');

// Settings elements
const addBlockedDayBtn = document.getElementById('addBlockedDayBtn');
const addBlockedDayForm = document.getElementById('addBlockedDayForm');
const blockedDayDate = document.getElementById('blockedDayDate');
const blockedDayReason = document.getElementById('blockedDayReason');
const saveBlockedDayBtn = document.getElementById('saveBlockedDayBtn');
const blockedDaysList = document.getElementById('blockedDaysList');
const baseLat = document.getElementById('baseLat');
const baseLng = document.getElementById('baseLng');
const baseAddress = document.getElementById('baseAddress');
const saveBaseLocationBtn = document.getElementById('saveBaseLocationBtn');
const orsApiKeyInput = document.getElementById('orsApiKey');
const saveOrsKeyBtn = document.getElementById('saveOrsKeyBtn');

// Manual points modal elements
const addPointsOverlay = document.getElementById('addPointsOverlay');
const pointsUserId = document.getElementById('pointsUserId');
const pointsUserName = document.getElementById('pointsUserName');
const pointsAmount = document.getElementById('pointsAmount');
const pointsReason = document.getElementById('pointsReason');
const closePointsModal = document.getElementById('closePointsModal');
const cancelPointsBtn = document.getElementById('cancelPointsBtn');
const savePointsBtn = document.getElementById('savePointsBtn');

// Init
document.addEventListener('DOMContentLoaded', async () => {
  await loadAnalytics();
  await loadBookings();
  await loadCustomers();
  setupTabs();
  setupFilters();
  setupSettings();
});

// Tabs
function setupTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      bookingsTab.classList.toggle('d-none', tab !== 'bookings');
      customersTab.classList.toggle('d-none', tab !== 'customers');
      settingsTab?.classList.toggle('d-none', tab !== 'settings');
      
      // Load settings data when tab is opened
      if (tab === 'settings') {
        await loadBlockedDays();
        await loadBaseLocation();
        await loadOrsApiKey();
      }
    });
  });
}

// Filters
function setupFilters() {
  statusFilterEl.addEventListener('change', () => {
    bookingsPage = 1;
    renderBookings();
  });
  bookingSearchEl.addEventListener('input', () => {
    bookingsPage = 1;
    renderBookings();
  });
  customerSearchEl.addEventListener('input', () => {
    customersPage = 1;
    renderCustomers();
  });
}

// Analytics
async function loadAnalytics() {
  const { data: bookings, error: bookingsError } = await supabaseClient
    .from('bookings')
    .select('amount, created_at');

  if (bookingsError) {
    console.error('Analytics bookings error:', bookingsError.message);
  }

  const { count: customerCount, error: customerError } = await supabaseClient
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'customer');

  if (customerError) {
    console.error('Analytics customers error:', customerError.message);
  }

  const total = bookings?.length || 0;
  const sales = bookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
  const today = new Date().toISOString().split('T')[0];
  const todayCount = bookings?.filter(b => b.created_at?.startsWith(today)).length || 0;

  totalBookingEl.textContent = total;
  totalSalesEl.textContent = sales.toLocaleString('ms-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  todayBookingEl.textContent = todayCount;
  totalCustomersEl.textContent = customerCount || 0;
}

// Bookings
async function loadBookings() {
  const { data, error } = await supabaseClient
    .from('bookings')
    .select('id, created_at, service, status, amount, details, user_id')
    .order('created_at', { ascending: false });

  if (error) {
    toast.error(error.message);
    return;
  }

  // Fetch profiles for each booking
  const userIds = [...new Set(data?.map(b => b.user_id).filter(Boolean))];
  
  let profilesMap = {};
  if (userIds.length) {
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, name, phone, address, location')
      .in('id', userIds);
    
    profiles?.forEach(p => {
      profilesMap[p.id] = p;
    });
  }

  // Attach profile to each booking
  allBookings = (data || []).map(b => ({
    ...b,
    profile: profilesMap[b.user_id] || {}
  }));
  
  renderBookings();
}

function renderBookings() {
  const statusFilter = statusFilterEl.value;
  const search = bookingSearchEl.value.toLowerCase();
  
  let filtered = allBookings;
  
  // Filter by status
  if (statusFilter) {
    filtered = filtered.filter(b => b.status === statusFilter);
  }
  
  // Filter by search (service, customer name, phone)
  if (search) {
    filtered = filtered.filter(b => {
      const profile = b.profile || {};
      const details = b.details || {};
      const customerName = (profile.name || '').toLowerCase();
      const phone = (profile.phone || details.phone || '').toLowerCase();
      const service = (b.service || '').toLowerCase();
      return customerName.includes(search) || phone.includes(search) || service.includes(search);
    });
  }

  if (!filtered.length) {
    bookingsListEl.innerHTML = '<div class="ak-empty">Tiada booking</div>';
    return;
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const start = (bookingsPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paged = filtered.slice(start, end);

  let html = paged.map(b => {
    const date = new Date(b.created_at);
    const dateStr = date.toLocaleDateString('ms-MY', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('ms-MY', {
      hour: '2-digit', minute: '2-digit'
    });

    const profile = b.profile || {};
    const details = b.details || {};
    const customerName = escapeHtml(profile.name || 'Unknown');
    const phone = escapeHtml(profile.phone || details.phone || '-');
    const address = escapeHtml(profile.address || details.pickup_address || '');
    const loc = profile.location;

    // Booking details
    const bookingDate = escapeHtml(details.booking_date || '-');
    const arrivalMethod = details.arrival_method === 'pickup' ? 'Pickup' : 'Walk-in';
    const cats = details.cats || [];
    const addons = details.addons || [];
    const note = escapeHtml(details.note || '');

    const statusClass = 
      b.status === 'pending' ? 'pending' :
      b.status === 'in_progress' ? 'in-progress' :
      b.status === 'completed' ? 'completed' : 'cancelled';

    const statusText = 
      b.status === 'pending' ? 'Menunggu' :
      b.status === 'in_progress' ? 'Sedang Diproses' :
      b.status === 'completed' ? 'Selesai' : 'Dibatalkan';

    // Build cats info (escaped)
    const catsInfo = cats.length 
      ? cats.map(c => `${escapeHtml(c.name)} (${escapeHtml(c.type)})`).join(', ')
      : '-';

    // Build addons info (escaped)
    const addonsInfo = addons.length ? addons.map(a => escapeHtml(a)).join(', ') : '-';

    // Map buttons
    const hasLocation = loc && loc.lat && loc.lng;
    const mapBtns = hasLocation ? `
      <div class="ak-map-buttons mt-2">
        <a href="https://www.google.com/maps?q=${loc.lat},${loc.lng}" 
           target="_blank" class="ak-map-btn ak-map-btn--google">
          <i class="bi bi-geo-alt-fill"></i> Google
        </a>
        <a href="https://waze.com/ul?ll=${loc.lat},${loc.lng}&navigate=yes" 
           target="_blank" class="ak-map-btn ak-map-btn--waze">
          <i class="bi bi-cursor-fill"></i> Waze
        </a>
      </div>
    ` : '';

    return `
      <div class="ak-admin-item ak-admin-item--expanded">
        <div class="ak-admin-item-header">
          <div class="ak-admin-item-main">
            <div class="ak-admin-item-title">${customerName}</div>
            <div class="ak-admin-item-sub">
              <span class="ak-badge ak-badge--service">${b.service}</span>
              <span class="ak-badge ak-badge--arrival">${arrivalMethod}</span>
            </div>
          </div>
          <div class="ak-admin-item-side">
            <div class="ak-admin-item-amount">RM${b.amount}</div>
            <div class="ak-admin-item-status ak-sts--${statusClass}">${statusText}</div>
          </div>
        </div>
        
        <div class="ak-admin-item-details">
          <div class="ak-detail-row">
            <i class="bi bi-calendar3"></i>
            <span><strong>Tarikh Booking:</strong> ${bookingDate}</span>
          </div>
          <div class="ak-detail-row">
            <i class="bi bi-clock"></i>
            <span><strong>Dibuat:</strong> ${dateStr} ${timeStr}</span>
          </div>
          ${phone !== '-' ? `
          <div class="ak-detail-row">
            <i class="bi bi-telephone"></i>
            <span><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></span>
          </div>
          ` : ''}
          ${address ? `
          <div class="ak-detail-row">
            <i class="bi bi-house"></i>
            <span><strong>Alamat:</strong> ${address}</span>
          </div>
          ` : ''}
          ${b.service === 'Grooming' ? `
          <div class="ak-detail-row">
            <i class="bi bi-heart"></i>
            <span><strong>Kucing:</strong> ${catsInfo}</span>
          </div>
          <div class="ak-detail-row">
            <i class="bi bi-plus-circle"></i>
            <span><strong>Add-on:</strong> ${addonsInfo}</span>
          </div>
          ` : ''}
          ${note ? `
          <div class="ak-detail-row">
            <i class="bi bi-chat-left-text"></i>
            <span><strong>Nota:</strong> ${note}</span>
          </div>
          ` : ''}
          ${mapBtns}
        </div>

        ${b.status === 'pending' ? `
          <div class="ak-admin-item-actions">
            <button class="ak-btn-approve-full" onclick="updateBookingStatus('${b.id}', 'in_progress')">
              <i class="bi bi-play-fill"></i> Mula Proses
            </button>
            <button class="ak-btn-reject-full" onclick="updateBookingStatus('${b.id}', 'cancelled')">
              <i class="bi bi-x-lg"></i> Batal
            </button>
          </div>
        ` : ''}
        ${b.status === 'in_progress' ? `
          <div class="ak-admin-item-actions">
            <button class="ak-btn-approve-full" onclick="updateBookingStatus('${b.id}', 'completed')">
              <i class="bi bi-check-lg"></i> Selesai
            </button>
            <button class="ak-btn-reject-full" onclick="updateBookingStatus('${b.id}', 'cancelled')">
              <i class="bi bi-x-lg"></i> Batal
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Add pagination
  if (totalPages > 1) {
    html += renderPagination(bookingsPage, totalPages, filtered.length, 'bookings');
  }

  bookingsListEl.innerHTML = html;
}

async function updateBookingStatus(id, status) {
  const updateData = { status };
  const now = new Date();
  
  // Set completed_at when status changes to completed
  if (status === 'completed') {
    updateData.completed_at = now.toISOString();
  }
  
  const { error } = await supabaseClient
    .from('bookings')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    toast.error(error.message);
    return;
  }

  // Grant loyalty points when booking is completed
  if (status === 'completed') {
    await grantLoyaltyPoints(id, now);
  }

  const statusMsg = 
    status === 'in_progress' ? 'Proses bermula!' :
    status === 'completed' ? 'Booking selesai!' : 'Booking dibatalkan';
  
  toast.success(statusMsg);
  await loadBookings();
  await loadAnalytics();
}

// Grant loyalty points for completed booking
async function grantLoyaltyPoints(bookingId, completedAt) {
  try {
    // Get booking details
    const { data: booking, error: bookingErr } = await supabaseClient
      .from('bookings')
      .select('user_id, amount, details')
      .eq('id', bookingId)
      .single();
    
    if (bookingErr || !booking) {
      console.warn('Could not fetch booking for loyalty:', bookingErr);
      return;
    }

    // Prevent double-granting if already granted for this booking
    {
      const { data: existing, error: existErr } = await supabaseClient
        .from('loyalty_transactions')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('is_manual', false)
        .maybeSingle();

      if (!existErr && existing?.id) return;
    }
    
    // Calculate eligible amount for points (exclude certain add-ons)
    // Exclude: Ubat cacing, Ubat kutu, Content/COD
    const excludedKeys = new Set(['worm', 'fleamed', 'flea_med', 'content', 'cod']);
    const excludedLabelIncludes = ['ubat cacing', 'ubat kutu', 'content', 'cod'];

    function isExcludedAddon(addon) {
      if (!addon) return false;
      const key = String(addon.key || '').toLowerCase().replace(/[\s_-]/g, '');
      if (excludedKeys.has(key)) return true;
      const label = String(addon.label || '').toLowerCase();
      return excludedLabelIncludes.some(s => label.includes(s));
    }

    let excludedAmount = 0;
    const details = booking.details || {};
    const cats = Array.isArray(details.cats) ? details.cats : [];
    cats.forEach(c => {
      const addons = Array.isArray(c?.addons) ? c.addons : [];
      addons.forEach(a => {
        if (!isExcludedAddon(a)) return;
        const price = Number(a.price || 0);
        if (Number.isFinite(price) && price > 0) excludedAmount += price;
      });
    });

    const rawAmount = Number(booking.amount || 0);
    const eligibleAmount = Math.max(0, rawAmount - excludedAmount);

    // Calculate points (RM1 = 1 point) based on eligible amount only
    const points = Math.floor(eligibleAmount);
    if (points <= 0) return;
    
    // Calculate expiry date (3 months from completion)
    const expiresAt = new Date(completedAt);
    expiresAt.setMonth(expiresAt.getMonth() + 3);
    
    // Insert loyalty transaction
    const { error: loyaltyErr } = await supabaseClient
      .from('loyalty_transactions')
      .insert({
        user_id: booking.user_id,
        booking_id: bookingId,
        points: points,
        reason: 'Booking selesai',
        earned_at: completedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_manual: false
      });
    
    if (loyaltyErr) {
      console.warn('Could not grant loyalty points:', loyaltyErr);
    }
  } catch (e) {
    console.warn('Loyalty points error:', e);
  }
}

// Customers
async function loadCustomers() {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, name, email, phone, address, location')
    .eq('role', 'customer')
    .order('name');

  if (error) {
    toast.error(error.message);
    return;
  }

  // Fetch loyalty points for each customer
  const customerIds = data?.map(c => c.id).filter(Boolean) || [];
  let loyaltyMap = {};
  
  if (customerIds.length) {
    const now = new Date();
    const { data: loyaltyData } = await supabaseClient
      .from('loyalty_transactions')
      .select('user_id, points, expires_at')
      .in('user_id', customerIds);

    loyaltyData?.forEach(t => {
      const exp = t.expires_at ? new Date(t.expires_at) : null;
      const isActive = !exp || exp > now;
      if (!isActive) return;
      loyaltyMap[t.user_id] = (loyaltyMap[t.user_id] || 0) + (t.points || 0);
    });
  }

  // Attach points to each customer
  allCustomers = (data || []).map(c => ({
    ...c,
    points: loyaltyMap[c.id] || 0
  }));
  
  renderCustomers();
}

function renderCustomers() {
  const search = customerSearchEl.value.toLowerCase();
  const filtered = search
    ? allCustomers.filter(c => 
        c.name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search) ||
        c.address?.toLowerCase().includes(search)
      )
    : allCustomers;

  if (!filtered.length) {
    customersListEl.innerHTML = '<div class="ak-empty">Tiada pelanggan</div>';
    return;
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const start = (customersPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paged = filtered.slice(start, end);

  let html = paged.map(c => {
    const loc = c.location;
    const hasLocation = loc && loc.lat && loc.lng;

    const mapButtons = hasLocation ? `
      <div class="ak-map-buttons">
        <a href="https://www.google.com/maps?q=${loc.lat},${loc.lng}" 
           target="_blank" class="ak-map-btn ak-map-btn--google">
          <i class="bi bi-geo-alt-fill"></i> Google
        </a>
        <a href="https://waze.com/ul?ll=${loc.lat},${loc.lng}&navigate=yes" 
           target="_blank" class="ak-map-btn ak-map-btn--waze">
          <i class="bi bi-cursor-fill"></i> Waze
        </a>
      </div>
    ` : '<div class="ak-no-location"><i class="bi bi-geo-alt"></i> Tiada lokasi</div>';

    const safeName = escapeHtml(c.name || 'Tiada nama').replace(/'/g, "\\'");
    
    return `
      <div class="ak-admin-item">
        <div class="ak-admin-item-main">
          <div class="ak-admin-item-title">${escapeHtml(c.name || 'Tiada nama')}</div>
          <div class="ak-admin-item-sub">${escapeHtml(c.email)}</div>
          ${c.phone ? `<div class="ak-admin-item-phone"><i class="bi bi-telephone"></i> ${escapeHtml(c.phone)}</div>` : ''}
          ${c.address ? `<div class="ak-admin-item-address"><i class="bi bi-house"></i> ${escapeHtml(c.address)}</div>` : ''}
          <div class="ak-admin-item-points"><i class="bi bi-star-fill"></i> ${c.points} points</div>
        </div>
        <div class="ak-admin-item-side">
          ${mapButtons}
          <button class="btn btn-sm btn-outline-primary mt-2" 
            onclick="openAddPointsModal('${c.id}', '${safeName}')">
            <i class="bi bi-plus-circle"></i> Points
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add pagination
  if (totalPages > 1) {
    html += renderPagination(customersPage, totalPages, filtered.length, 'customers');
  }

  customersListEl.innerHTML = html;
}

// Pagination
function renderPagination(currentPage, totalPages, totalItems, type) {
  const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const end = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return `
    <div class="ak-pagination">
      <div class="ak-pagination-info">
        ${start}-${end} daripada ${totalItems}
      </div>
      <div class="ak-pagination-btns">
        <button class="ak-pagination-btn" 
          onclick="goToPage('${type}', ${currentPage - 1})"
          ${currentPage === 1 ? 'disabled' : ''}>
          <i class="bi bi-chevron-left"></i>
        </button>
        <span class="ak-pagination-current">${currentPage} / ${totalPages}</span>
        <button class="ak-pagination-btn" 
          onclick="goToPage('${type}', ${currentPage + 1})"
          ${currentPage === totalPages ? 'disabled' : ''}>
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
}

function goToPage(type, page) {
  if (type === 'bookings') {
    bookingsPage = page;
    renderBookings();
  } else {
    customersPage = page;
    renderCustomers();
  }
  
  // Scroll to top of list
  const listEl = type === 'bookings' ? bookingsListEl : customersListEl;
  listEl.scrollTop = 0;
}

// Logout
document.getElementById('logoutBtn').onclick = async () => {
  await supabaseClient.auth.signOut();
  toast.success('Logout berjaya');
  setTimeout(() => go('login'), 1000);
};

// Expose to window for onclick
window.updateBookingStatus = updateBookingStatus;
window.goToPage = goToPage;

// =====================================================
// SETTINGS FUNCTIONS
// =====================================================

let allBlockedDays = [];

function setupSettings() {
  // Toggle add blocked day form
  addBlockedDayBtn?.addEventListener('click', () => {
    addBlockedDayForm?.classList.toggle('d-none');
    // Set min date to tomorrow
    if (blockedDayDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      blockedDayDate.min = tomorrow.toISOString().split('T')[0];
    }
  });
  
  // Save blocked day
  saveBlockedDayBtn?.addEventListener('click', saveBlockedDay);
  
  // Save base location
  saveBaseLocationBtn?.addEventListener('click', saveBaseLocation);

  // Save ORS key
  saveOrsKeyBtn?.addEventListener('click', saveOrsApiKey);
  
  // Manual points modal
  closePointsModal?.addEventListener('click', closePointsModalFn);
  cancelPointsBtn?.addEventListener('click', closePointsModalFn);
  savePointsBtn?.addEventListener('click', saveManualPoints);
  
  // Close modal on overlay click
  addPointsOverlay?.addEventListener('click', (e) => {
    if (e.target === addPointsOverlay) closePointsModalFn();
  });
}

async function loadBlockedDays() {
  const { data, error } = await supabaseClient
    .from('blocked_days')
    .select('*')
    .order('date', { ascending: true });
  
  if (error) {
    console.error('Error loading blocked days:', error);
    return;
  }
  
  allBlockedDays = data || [];
  renderBlockedDays();
}

function renderBlockedDays() {
  if (!blockedDaysList) return;
  
  if (!allBlockedDays.length) {
    blockedDaysList.innerHTML = '<div class="ak-empty">Tiada hari disekat</div>';
    return;
  }
  
  const html = allBlockedDays.map(d => {
    const dateObj = new Date(d.date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('ms-MY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    return `
      <div class="ak-admin-item" data-blocked-id="${d.id}">
        <div class="ak-admin-item-main">
          <div class="ak-admin-item-title">${escapeHtml(dateStr)}</div>
          ${d.reason ? `<div class="ak-admin-item-sub">${escapeHtml(d.reason)}</div>` : ''}
        </div>
        <div class="ak-admin-item-side">
          <button class="btn btn-sm btn-outline-danger" onclick="deleteBlockedDay('${d.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  blockedDaysList.innerHTML = html;
}

async function saveBlockedDay() {
  const date = blockedDayDate?.value;
  const reason = blockedDayReason?.value?.trim() || null;
  
  if (!date) {
    toast.warning('Sila pilih tarikh');
    return;
  }
  
  const { error } = await supabaseClient
    .from('blocked_days')
    .insert({ date, reason });
  
  if (error) {
    if (error.code === '23505') {
      toast.error('Tarikh ini sudah disekat');
    } else {
      toast.error('Gagal menyimpan: ' + error.message);
    }
    return;
  }
  
  toast.success('Tarikh berjaya disekat');
  
  // Reset form
  if (blockedDayDate) blockedDayDate.value = '';
  if (blockedDayReason) blockedDayReason.value = '';
  addBlockedDayForm?.classList.add('d-none');
  
  await loadBlockedDays();
}

async function deleteBlockedDay(id) {
  if (!confirm('Pasti nak padam hari ini?')) return;
  
  const { error } = await supabaseClient
    .from('blocked_days')
    .delete()
    .eq('id', id);
  
  if (error) {
    toast.error('Gagal memadam: ' + error.message);
    return;
  }
  
  toast.success('Berjaya dipadam');
  await loadBlockedDays();
}

async function loadBaseLocation() {
  const { data, error } = await supabaseClient
    .from('settings')
    .select('value')
    .eq('key', 'base_location')
    .maybeSingle();
  
  if (error) {
    console.error('Error loading base location:', error);
    return;
  }
  
  if (data?.value) {
    const loc = data.value;
    if (baseLat) baseLat.value = loc.lat || '';
    if (baseLng) baseLng.value = loc.lng || '';
    if (baseAddress) baseAddress.value = loc.address || '';
  }
}

async function loadOrsApiKey() {
  const { data, error } = await supabaseClient
    .from('settings')
    .select('value')
    .eq('key', 'ors_api_key')
    .maybeSingle();

  if (error) {
    console.error('Error loading ORS key:', error);
    return;
  }

  const key = data?.value?.key || data?.value?.api_key || '';
  if (orsApiKeyInput) orsApiKeyInput.value = key;
}

async function saveBaseLocation() {
  const lat = parseFloat(baseLat?.value);
  const lng = parseFloat(baseLng?.value);
  const address = baseAddress?.value?.trim() || '';
  
  if (isNaN(lat) || isNaN(lng)) {
    toast.warning('Sila masukkan koordinat yang sah');
    return;
  }
  
  const value = { lat, lng, address };
  
  const { error } = await supabaseClient
    .from('settings')
    .upsert({ key: 'base_location', value, updated_at: new Date().toISOString() });
  
  if (error) {
    toast.error('Gagal menyimpan: ' + error.message);
    return;
  }
  
  toast.success('Lokasi berjaya disimpan');
}

// =====================================================
// MANUAL POINTS FUNCTIONS
// =====================================================

function openAddPointsModal(userId, userName) {
  if (!addPointsOverlay) return;
  
  if (pointsUserId) pointsUserId.value = userId;
  if (pointsUserName) pointsUserName.value = userName;
  if (pointsAmount) pointsAmount.value = '';
  if (pointsReason) pointsReason.value = '';
  
  addPointsOverlay.classList.remove('d-none');
}

function closePointsModalFn() {
  addPointsOverlay?.classList.add('d-none');
}

async function saveManualPoints() {
  const userId = pointsUserId?.value;
  const amount = parseInt(pointsAmount?.value, 10);
  const reason = pointsReason?.value?.trim() || 'Manual credit oleh admin';
  
  if (!userId) {
    toast.error('User tidak sah');
    return;
  }
  
  if (!amount || amount <= 0) {
    toast.warning('Sila masukkan jumlah points yang sah');
    return;
  }
  
  if (amount > 10000) {
    toast.warning('Maksimum 10,000 points sekali tambah');
    return;
  }
  
  const { error } = await supabaseClient
    .from('loyalty_transactions')
    .insert({
      user_id: userId,
      points: amount,
      reason: reason,
      earned_at: new Date().toISOString(),
      expires_at: null, // Manual points don't expire
      is_manual: true
    });
  
  if (error) {
    toast.error('Gagal menambah points: ' + error.message);
    return;
  }
  
  toast.success(`${amount} points berjaya ditambah!`);
  closePointsModalFn();
  await loadCustomers(); // Refresh to show updated points
}

async function saveOrsApiKey() {
  const key = orsApiKeyInput?.value?.trim() || '';

  // Allow clearing key (fallback to haversine)
  const value = { key };

  const { error } = await supabaseClient
    .from('settings')
    .upsert({ key: 'ors_api_key', value, updated_at: new Date().toISOString() });

  if (error) {
    toast.error('Gagal menyimpan ORS key: ' + error.message);
    return;
  }

  toast.success(key ? 'ORS key berjaya disimpan' : 'ORS key dibuang (fallback anggaran)');
}

// Expose settings functions
window.deleteBlockedDay = deleteBlockedDay;
window.openAddPointsModal = openAddPointsModal;
