/* =====================================================
   BOOKING – PRAKTIKAL UNTUK CUSTOMER
   - Service toggle (Grooming / Cat Hotel)
   - Multi kucing + jenis + addon (Grooming)
   - Cara kedatangan (walk-in / pickup)
   - Pickup guna profile (register)
   ===================================================== */

const bookingForm = document.getElementById('bookingForm');
const serviceInput = document.getElementById('service');
const serviceButtons = document.querySelectorAll('[data-service]');
const groomingFields = document.getElementById('groomingFields');
const dateInput = document.getElementById('date');
const hotelFields = document.getElementById('hotelFields');
const computedAmountInput = document.getElementById('computedAmount'); // Grooming (auto)

const arrivalWalkin = document.getElementById('arrivalWalkin');
const arrivalPickup = document.getElementById('arrivalPickup');
const pickupBox = document.getElementById('pickupBox');
const pickupName = document.getElementById('pickupName');
const pickupAddress = document.getElementById('pickupAddress');

const addCatBtn = document.getElementById('addCatBtn');
const catsContainer = document.getElementById('catsContainer');
// Addons are now per-cat with dynamic pricing
const groomingTotal = document.getElementById('groomingTotal');
const breakdownList = document.getElementById('breakdownList');
const noteInput = document.getElementById('bookingNote');
const summaryCount = document.getElementById('summaryCount');
const summaryTotal = document.getElementById('summaryTotal');
const continueBtn = document.querySelector('.ak-continue-btn');

// Wheel date picker elements
const dateOverlay = document.getElementById('akDateOverlay');
const dateSheet = document.getElementById('akDateSheet');
const dateCancelBtn = document.getElementById('akDateCancel');
const dateDoneBtn = document.getElementById('akDateDone');
const wheelDay = document.getElementById('akWheelDay');
const wheelMonth = document.getElementById('akWheelMonth');
const wheelYear = document.getElementById('akWheelYear');

let currentUser = null;
let profileInfo = { name: '', address: '', phone: '', location: null };
let baseLocation = null; // Shop base location for pickup distance calculation
let pickupFee = 0; // Current pickup fee
let pickupDistanceKm = null;
let pickupDistanceSource = null; // 'ors' | 'haversine' | null
let pickupFeeReady = true;
let orsApiKey = '';
let pickupReqSeq = 0;
const pickupDistanceCache = new Map(); // key: "lat1,lng1|lat2,lng2" -> { km, source }

const SHOP_LABEL = 'Abang Kucing Grooming & Hotel';
const SHOP_FALLBACK_ADDRESS = 'No 52-Floor 2 Pusat Komersial Cabang 3, 21100 Kuala Terengganu, Terengganu';

function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function getShopAddressText() {
  const addrRaw = normalizeSpaces(baseLocation?.address || '');
  return addrRaw ? addrRaw : SHOP_FALLBACK_ADDRESS;
}

function getShopDisplayText() {
  const addr = normalizeSpaces(getShopAddressText());
  const label = normalizeSpaces(SHOP_LABEL);
  const addrLower = addr.toLowerCase();
  const labelLower = label.toLowerCase();

  // If admin already stored address starting with or containing the shop label, don't duplicate it
  if (addrLower.startsWith(labelLower)) return addr;
  if (addrLower.includes(labelLower)) return addr;

  return `${label}, ${addr}`;
}

function fmtCoord(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(6);
}

function updatePickupDistanceNote() {
  const el = document.getElementById('pickupDistanceNote');
  if (!el) return;

  const shopText = getShopDisplayText();

  if (Number.isFinite(pickupDistanceKm)) {
    const label =
      pickupDistanceSource === 'ors' ? 'jarak jalan' :
      pickupDistanceSource === 'haversine' ? 'anggaran jarak' :
      'jarak';
    el.textContent =
      `Jarak ini (${pickupDistanceKm.toFixed(1)}km, ${label}) dari kedai kami di ${shopText}.`;
    return;
  }

  el.textContent =
    `Jarak ini dari kedai kami di ${shopText}.`;
}

// Hotel elements
const hotelCatCount = document.getElementById('hotelCatCount');
const hotelNightCount = document.getElementById('hotelNightCount');
const hotelCatMinus = document.getElementById('hotelCatMinus');
const hotelCatPlus = document.getElementById('hotelCatPlus');
const hotelNightMinus = document.getElementById('hotelNightMinus');
const hotelNightPlus = document.getElementById('hotelNightPlus');
const hotelBreakdown = document.getElementById('hotelBreakdown');
const hotelTotal = document.getElementById('hotelTotal');
const amountInput = document.getElementById('amount');

document.addEventListener('DOMContentLoaded', async () => {
  setupServiceButtons();
  setService('Grooming');
  await fetchBaseLocation();
  await fetchOrsApiKey();
  loadProfile();
  setupArrivalMethod();
  setupGroomingUI();
  setupHotelUI();
  if (continueBtn) continueBtn.disabled = true;
  setupDatePicker();
});

function setupServiceButtons() {
  serviceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setService(btn.dataset.service);
    });
  });
}

function setService(service) {
  serviceInput.value = service;

  serviceButtons.forEach(btn => {
    btn.classList.toggle(
      'active',
      btn.dataset.service === service
    );
  });

  const isGrooming = service === 'Grooming';
  groomingFields.classList.toggle('d-none', !isGrooming);
  hotelFields.classList.toggle('d-none', isGrooming);

  computeAndRenderTotals();
}

function setContinueReady(isReady) {
  if (!continueBtn) return;
  continueBtn.disabled = !isReady;
  continueBtn.classList.toggle('is-ready', isReady);
}

function setupArrivalMethod() {
  function syncPickupVisibility() {
    const isPickup = arrivalPickup.checked;
    pickupBox.classList.toggle('d-none', !isPickup);
    
    // Fix map size when pickup box becomes visible
    if (isPickup && pickupPreviewMap) {
      setTimeout(() => {
        pickupPreviewMap.invalidateSize();
      }, 150);
    }
    
    // Update pickup fee when arrival method changes
    updatePickupFee();
  }

  arrivalWalkin.addEventListener('change', syncPickupVisibility);
  arrivalPickup.addEventListener('change', syncPickupVisibility);
  syncPickupVisibility();
}

function setupGroomingUI() {
  if (!addCatBtn || !catsContainer) return;

  addCatBtn.addEventListener('click', () => {
    addCatRow();
    computeAndRenderTotals();
  });

  catsContainer.addEventListener('input', (e) => {
    if (e.target.matches('input')) {
      computeAndRenderTotals();
    }
  });

  // jenis pills
  catsContainer.addEventListener('click', (e) => {
    const typeBtn = e.target.closest('[data-cat-type]');
    if (!typeBtn) return;

    const row = typeBtn.closest('[data-cat-row]');
    if (!row) return;

    const type = typeBtn.dataset.catType;
    const hidden = row.querySelector('.cat-type');

    if (hidden) hidden.value = type;

    row.querySelectorAll('[data-cat-type]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.catType === type);
    });

    computeAndRenderTotals();
  });

  catsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-cat]');
    if (!btn) return;

    btn.closest('[data-cat-row]')?.remove();
    ensureAtLeastOneCat();
    computeAndRenderTotals();
  });

  // Addon listeners are now attached per cat row in addCatRow()

  ensureAtLeastOneCat();
  computeAndRenderTotals();
}

function setupHotelUI() {
  if (!hotelCatCount || !hotelNightCount) return;

  // Cat stepper
  hotelCatMinus?.addEventListener('click', () => {
    const val = parseInt(hotelCatCount.value, 10) || 1;
    if (val > 1) {
      hotelCatCount.value = val - 1;
      computeAndRenderTotals();
    }
  });

  hotelCatPlus?.addEventListener('click', () => {
    const val = parseInt(hotelCatCount.value, 10) || 1;
    if (val < 10) {
      hotelCatCount.value = val + 1;
      computeAndRenderTotals();
    }
  });

  // Night stepper
  hotelNightMinus?.addEventListener('click', () => {
    const val = parseInt(hotelNightCount.value, 10) || 1;
    if (val > 1) {
      hotelNightCount.value = val - 1;
      computeAndRenderTotals();
    }
  });

  hotelNightPlus?.addEventListener('click', () => {
    const val = parseInt(hotelNightCount.value, 10) || 1;
    if (val < 30) {
      hotelNightCount.value = val + 1;
      computeAndRenderTotals();
    }
  });
}

function ensureAtLeastOneCat() {
  if (!catsContainer) return;
  if (catsContainer.querySelector('[data-cat-row]')) return;
  addCatRow();
}

// Addon pricing by cat type
const addonPricing = {
  kitten: {
    longhair: { label: 'Longhair (bulu panjang)', price: 10 },
    flea: { label: 'Mandian kutu/fungus', price: 10 },
    worm: { label: 'Ubat cacing', price: 10 },
    fleaMed: { label: 'Ubat kutu', price: 40 },
    content: { label: 'Content', price: 50 }
  },
  short_hair: {
    flea: { label: 'Mandian kutu/fungus', price: 15 },
    worm: { label: 'Ubat cacing', price: 15 },
    content: { label: 'Content', price: 50 },
    fleaMed: { label: 'Ubat kutu', price: 60 }
  },
  long_hair: {
    flea: { label: 'Mandian kutu/fungus', price: 15 },
    worm: { label: 'Ubat cacing', price: 15 },
    content: { label: 'Content', price: 50 },
    fleaMed: { label: 'Ubat kutu', price: 60 }
  }
};

function getAddonsHtml(catType) {
  const addons = addonPricing[catType] || addonPricing.kitten;
  let html = '<div class="ak-addons mt-3"><div class="form-label">Add-on (pilihan)</div>';
  
  for (const [key, addon] of Object.entries(addons)) {
    html += `
      <label class="ak-check-row">
        <span>
          <input class="form-check-input cat-addon" type="checkbox" 
            data-addon-key="${key}" data-addon-price="${addon.price}" data-addon-label="${escapeHtml(addon.label)}">
          <span class="ms-2">${escapeHtml(addon.label)}</span>
          <span class="ak-addon-price ms-1">RM${addon.price}</span>
        </span>
      </label>
    `;
  }
  
  html += '</div>';
  return html;
}

function addCatRow(prefill = {}) {
  const name = prefill.name ?? '';
  const type = prefill.type ?? 'kitten';

  const row = document.createElement('div');
  row.className = 'ak-card ak-cat-card';
  row.setAttribute('data-cat-row', '1');

  row.innerHTML = `
    <div class="ak-row-between mb-2">
      <div class="ak-section-title mb-0">Kucing</div>
      <button type="button" class="ak-icon-btn" data-remove-cat="1" aria-label="Remove">
        ✕
      </button>
    </div>

    <label class="form-label">Nama Kucing</label>
    <input type="text" class="form-control cat-name"
      placeholder="Contoh: Oyen" value="${escapeHtml(name)}" required>

    <div class="mt-3">
      <div class="form-label">Jenis</div>
      <div class="ak-pills" role="group" aria-label="Jenis kucing">
        <button type="button" class="ak-pill ${type === 'kitten' ? 'active' : ''}"
          data-cat-type="kitten">
          Kitten<br><span class="ak-pill-sub">RM25</span>
        </button>
        <button type="button" class="ak-pill ${type === 'short_hair' ? 'active' : ''}"
          data-cat-type="short_hair">
          Short hair<br><span class="ak-pill-sub">RM35</span>
        </button>
        <button type="button" class="ak-pill ${type === 'long_hair' ? 'active' : ''}"
          data-cat-type="long_hair">
          Long hair<br><span class="ak-pill-sub">RM45</span>
        </button>
      </div>
      <input type="hidden" class="cat-type" value="${escapeHtml(type)}">
    </div>

    ${getAddonsHtml(type)}
  `;

  catsContainer.appendChild(row);

  // Add event listener to update addons when cat type changes
  row.querySelectorAll('.ak-pill[data-cat-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const newType = btn.dataset.catType;
      const addonsContainer = row.querySelector('.ak-addons');
      if (addonsContainer) {
        addonsContainer.outerHTML = getAddonsHtml(newType);
        // Reattach addon change listeners
        attachAddonListeners(row);
      }
    });
  });

  attachAddonListeners(row);
}

function attachAddonListeners(row) {
  row.querySelectorAll('.cat-addon').forEach(cb => {
    cb.addEventListener('change', computeAndRenderTotals);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Fetch shop base location for pickup distance calculation
async function fetchBaseLocation() {
  try {
    const { data, error } = await supabaseClient
      .from('settings')
      .select('value')
      .eq('key', 'base_location')
      .maybeSingle();
    
    if (!error && data?.value) {
      baseLocation = data.value;
    }
  } catch (e) {
    console.warn('Could not fetch base location:', e);
  }
}

async function fetchOrsApiKey() {
  try {
    const { data, error } = await supabaseClient
      .from('settings')
      .select('value')
      .eq('key', 'ors_api_key')
      .maybeSingle();

    if (!error && data?.value) {
      orsApiKey = String(data.value.key || data.value.api_key || '').trim();
    }
  } catch (e) {
    console.warn('Could not fetch ORS API key:', e);
  }
}

// Haversine formula to calculate distance between two coordinates (in km)
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getOrsDrivingDistanceKm(fromLat, fromLng, toLat, toLng) {
  if (!orsApiKey) return null;

  const cacheKey = `${fromLat},${fromLng}|${toLat},${toLng}`;
  const cached = pickupDistanceCache.get(cacheKey);
  if (cached?.source === 'ors' && Number.isFinite(cached.km)) return cached.km;

  // ORS Directions API v2
  // Docs: https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/
  const url = 'https://api.openrouteservice.org/v2/directions/driving-car';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': orsApiKey
    },
    body: JSON.stringify({
      coordinates: [
        [fromLng, fromLat],
        [toLng, toLat]
      ]
    })
  });

  if (!res.ok) return null;
  const json = await res.json();

  const meters = json?.routes?.[0]?.summary?.distance;
  if (!Number.isFinite(meters)) return null;

  const km = meters / 1000;
  pickupDistanceCache.set(cacheKey, { km, source: 'ors' });
  return km;
}

// Calculate pickup fee based on distance
function calculatePickupFee(customerLat, customerLng) {
  if (!baseLocation || !baseLocation.lat || !baseLocation.lng) {
    return 0; // No base location set
  }
  
  if (!customerLat || !customerLng) {
    return 0; // No customer location
  }
  
  const distance = haversineDistance(
    baseLocation.lat, baseLocation.lng,
    customerLat, customerLng
  );
  
  // Pricing: RM10 base for up to 8km, RM1.20 per extra km
  const baseFee = 10;
  const baseDistance = 8;
  const extraRatePerKm = 1.20;
  
  if (distance <= baseDistance) {
    return baseFee;
  }
  
  const extraKm = distance - baseDistance;
  const extraFee = extraKm * extraRatePerKm;
  
  // Round to 2 decimal places
  return Math.round((baseFee + extraFee) * 100) / 100;
}

function calculatePickupFeeFromKm(distanceKm) {
  const baseFee = 10;
  const baseDistance = 8;
  const extraRatePerKm = 1.20;

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  if (distanceKm <= baseDistance) return baseFee;

  const extraKm = distanceKm - baseDistance;
  const extraFee = extraKm * extraRatePerKm;
  return Math.round((baseFee + extraFee) * 100) / 100;
}

// Update pickup fee display
function updatePickupFee() {
  const pickupFeeEl = document.getElementById('pickupFeeDisplay');
  const reqId = ++pickupReqSeq;
  
  if (!arrivalPickup?.checked || !profileInfo.location) {
    pickupFee = 0;
    pickupDistanceKm = null;
    pickupDistanceSource = null;
    pickupFeeReady = true;
    if (pickupFeeEl) pickupFeeEl.classList.add('d-none');
    computeAndRenderTotals();
    return;
  }
  
  const loc = profileInfo.location;
  
  if (!baseLocation || !loc.lat || !loc.lng) {
    pickupFee = 0;
    pickupDistanceKm = null;
    pickupDistanceSource = null;
    pickupFeeReady = true;
    if (pickupFeeEl) pickupFeeEl.classList.add('d-none');
    computeAndRenderTotals();
    return;
  }

  // Show loading state while computing (ORS)
  pickupFeeReady = false;
  pickupFee = 0;
  pickupDistanceKm = null;
  pickupDistanceSource = null;
  if (pickupFeeEl) {
    pickupFeeEl.classList.remove('d-none');
    pickupFeeEl.innerHTML = `
      <i class="bi bi-truck"></i>
      <span>Mengira jarak pickup...</span>
    `;
  }
  computeAndRenderTotals();

  const fromLat = Number(baseLocation.lat);
  const fromLng = Number(baseLocation.lng);
  const toLat = Number(loc.lat);
  const toLng = Number(loc.lng);

  (async () => {
    // Prefer ORS driving distance if key exists, else fallback to haversine
    let km = await getOrsDrivingDistanceKm(fromLat, fromLng, toLat, toLng);
    let source = 'ors';

    if (!Number.isFinite(km)) {
      km = haversineDistance(fromLat, fromLng, toLat, toLng);
      source = 'haversine';
    }

    if (reqId !== pickupReqSeq) return; // stale response

    pickupDistanceKm = km;
    pickupDistanceSource = source;
    pickupFee = calculatePickupFeeFromKm(km);
    pickupFeeReady = true;

    if (pickupFeeEl) {
      const distanceText = km.toFixed(1);
      const label = source === 'ors' ? 'Jarak jalan' : 'Anggaran';
      pickupFeeEl.innerHTML = `
        <i class="bi bi-truck"></i>
        <span>${label} (${distanceText}km): <strong>RM${pickupFee.toFixed(2)}</strong></span>
      `;
    }

    updatePickupDistanceNote();
    computeAndRenderTotals();
  })();
}

async function loadProfile() {
  const { data: userData, error: userErr } =
    await supabaseClient.auth.getUser();

  if (userErr || !userData || !userData.user) {
    go('login');
    return;
  }

  currentUser = userData.user;
  const userMeta = currentUser.user_metadata || {};

  let profile = null;
  {
    const res =
      await supabaseClient
        .from('profiles')
        .select('name, address, phone, location')
        .eq('id', currentUser.id)
        .maybeSingle();

    if (!res.error) {
      profile = res.data;
    } else if (/address|location|phone/i.test(res.error.message || '')) {
      const res2 =
        await supabaseClient
          .from('profiles')
          .select('name, address, phone')
          .eq('id', currentUser.id)
          .maybeSingle();

      if (!res2.error) {
        profile = res2.data;
      } else {
        const res3 =
          await supabaseClient
            .from('profiles')
            .select('name')
            .eq('id', currentUser.id)
            .maybeSingle();
        profile = res3.data || null;
      }
    } else {
      console.warn('Gagal baca profile:', res.error.message);
    }
  }

  profileInfo = {
    name:
      profile?.name ||
      userMeta.name ||
      currentUser.email ||
      '',
    address:
      profile?.address ||
      userMeta.address ||
      '',
    phone:
      profile?.phone ||
      userMeta.phone ||
      '',
    location: profile?.location || null
  };

  updatePickupBox();
  updatePickupFee();
}

// Pickup map variables
let pickupPreviewMap = null;
let pickupPreviewMarker = null;
let pickupPickerMap = null;
let pickupPickerMarker = null;
let tempPickupLat = null;
let tempPickupLng = null;

const DEFAULT_LAT = 5.3117;
const DEFAULT_LNG = 103.1324;

const pickupMapModal = document.getElementById('pickupMapModal');
const pickupMapContainer = document.getElementById('pickupMapContainer');
const pickupMapClose = document.getElementById('pickupMapClose');
const pickupMapCancel = document.getElementById('pickupMapCancel');
const pickupMapConfirm = document.getElementById('pickupMapConfirm');

function updatePickupBox() {
  if (!pickupBox) return;

  const loc = profileInfo.location;
  const hasLocation = loc && loc.lat && loc.lng;

  if (pickupName) {
    pickupName.textContent = profileInfo.name || 'Pelanggan';
  }

  const pickupPhoneEl = document.getElementById('pickupPhone');
  if (pickupPhoneEl) {
    const phone = String(profileInfo.phone || '').trim();
    if (phone) {
      pickupPhoneEl.classList.remove('d-none');
      pickupPhoneEl.textContent = `No Telefon: ${phone}`;
    } else {
      pickupPhoneEl.classList.add('d-none');
      pickupPhoneEl.textContent = '';
    }
  }

  if (pickupAddress) {
    pickupAddress.textContent = profileInfo.address || 'Alamat belum dikemaskini';
  }

  const pickupCoordsEl = document.getElementById('pickupCoords');
  if (pickupCoordsEl) {
    if (hasLocation) {
      pickupCoordsEl.textContent = `Lat: ${fmtCoord(loc.lat)} , Lng: ${fmtCoord(loc.lng)}`;
    } else {
      pickupCoordsEl.textContent = 'Lat/Lng: —';
    }
  }

  updatePickupDistanceNote();

  // Remove old map/warning if exists
  const oldMap = pickupBox.querySelector('.ak-pickup-map');
  const oldWarning = pickupBox.querySelector('.ak-pickup-warning');
  if (oldMap) oldMap.remove();
  if (oldWarning) oldWarning.remove();

  // Reset preview map
  if (pickupPreviewMap) {
    pickupPreviewMap.remove();
    pickupPreviewMap = null;
    pickupPreviewMarker = null;
  }

  if (hasLocation) {
    // Show mini map preview with Leaflet
    const mapDiv = document.createElement('div');
    mapDiv.className = 'ak-pickup-map';
    mapDiv.innerHTML = `
      <div class="ak-pickup-map-preview" id="pickupPreviewMapEl"></div>
      <div class="ak-pickup-map-actions">
        <button type="button" class="ak-map-btn ak-map-btn--edit" id="editLocationBtn">
          <i class="bi bi-pencil"></i> Ubah Lokasi
        </button>
      </div>
    `;
    pickupBox.appendChild(mapDiv);

    // Initialize Leaflet preview map
    setTimeout(() => {
      const previewEl = document.getElementById('pickupPreviewMapEl');
      if (previewEl && typeof L !== 'undefined') {
        pickupPreviewMap = L.map(previewEl, {
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false
        }).setView([loc.lat, loc.lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: ''
        }).addTo(pickupPreviewMap);

        pickupPreviewMarker = L.circleMarker([loc.lat, loc.lng], {
          radius: 10,
          fillColor: '#3F51B5',
          color: '#fff',
          weight: 3,
          fillOpacity: 1
        }).addTo(pickupPreviewMap);

        // Fix map size after render
        setTimeout(() => {
          pickupPreviewMap.invalidateSize();
        }, 100);
      }

      // Edit button
      const editBtn = document.getElementById('editLocationBtn');
      if (editBtn) {
        editBtn.addEventListener('click', openPickupMapModal);
      }
    }, 50);
  } else {
    // Show set location box with button
    const setDiv = document.createElement('div');
    setDiv.className = 'ak-pickup-setloc';
    setDiv.innerHTML = `
      <i class="bi bi-geo-alt"></i>
      <div>
        <strong>Lokasi belum diset</strong>
        <p>Set lokasi rumah untuk pickup</p>
      </div>
      <button type="button" class="ak-btn-primary" id="setLocationBtn">
        <i class="bi bi-pin-map"></i> Set Lokasi
      </button>
    `;
    pickupBox.appendChild(setDiv);

    // Bind button
    setTimeout(() => {
      const setBtn = document.getElementById('setLocationBtn');
      if (setBtn) {
        setBtn.addEventListener('click', openPickupMapModal);
      }
    }, 10);
  }
}

function openPickupMapModal() {
  if (!pickupMapModal) return;

  pickupMapModal.classList.remove('d-none');
  document.body.style.overflow = 'hidden';

  // Reset confirm button
  if (pickupMapConfirm) pickupMapConfirm.disabled = true;

  // Initialize map
  setTimeout(() => {
    if (!pickupPickerMap && pickupMapContainer) {
      const startLat = profileInfo.location?.lat || DEFAULT_LAT;
      const startLng = profileInfo.location?.lng || DEFAULT_LNG;

      pickupPickerMap = L.map(pickupMapContainer).setView([startLat, startLng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(pickupPickerMap);

      // If already have location, show marker
      if (profileInfo.location?.lat && profileInfo.location?.lng) {
        pickupPickerMarker = L.circleMarker([startLat, startLng], {
          radius: 10,
          fillColor: '#3F51B5',
          color: '#fff',
          weight: 3,
          fillOpacity: 1
        }).addTo(pickupPickerMap);

        tempPickupLat = startLat;
        tempPickupLng = startLng;
        if (pickupMapConfirm) pickupMapConfirm.disabled = false;
      }

      // Click handler
      pickupPickerMap.on('click', onPickupMapClick);
    } else if (pickupPickerMap) {
      pickupPickerMap.invalidateSize();
    }
  }, 100);
}

function onPickupMapClick(e) {
  const { lat, lng } = e.latlng;
  tempPickupLat = lat;
  tempPickupLng = lng;

  if (pickupPickerMarker) {
    pickupPickerMarker.setLatLng([lat, lng]);
  } else {
    pickupPickerMarker = L.circleMarker([lat, lng], {
      radius: 10,
      fillColor: '#3F51B5',
      color: '#fff',
      weight: 3,
      fillOpacity: 1
    }).addTo(pickupPickerMap);
  }

  if (pickupMapConfirm) pickupMapConfirm.disabled = false;
}

function closePickupMapModal() {
  if (!pickupMapModal) return;
  pickupMapModal.classList.add('d-none');
  document.body.style.overflow = '';
}

async function confirmPickupLocation() {
  if (!tempPickupLat || !tempPickupLng || !currentUser) return;

  const location = { lat: tempPickupLat, lng: tempPickupLng };

  // Save to profile
  const payload = {
    id: currentUser.id,
    location: location
  };

  let { error } = await supabaseClient.from('profiles').upsert(payload);

  // Fallback if location column doesn't exist
  if (error && /location/i.test(error.message || '')) {
    toast.warning('Tidak dapat simpan lokasi. Sila kemaskini profil.');
    closePickupMapModal();
    return;
  }

  if (error) {
    toast.error(error.message);
    return;
  }

  // Update local profile info
  profileInfo.location = location;

  toast.success('Lokasi berjaya dikemaskini');
  closePickupMapModal();

  // Refresh pickup box and fee
  updatePickupBox();
  updatePickupFee();
}

// Bind modal buttons
if (pickupMapClose) pickupMapClose.addEventListener('click', closePickupMapModal);
if (pickupMapCancel) pickupMapCancel.addEventListener('click', closePickupMapModal);
if (pickupMapConfirm) pickupMapConfirm.addEventListener('click', confirmPickupLocation);

function getCatsFromDom() {
  if (!catsContainer) return [];

  const rows = [...catsContainer.querySelectorAll('[data-cat-row]')];

  return rows.map(r => {
    const name = (r.querySelector('.cat-name')?.value || '').trim();
    const type = r.querySelector('.cat-type')?.value || 'kitten';
    
    // Get selected addons for this cat
    const addons = [];
    r.querySelectorAll('.cat-addon:checked').forEach(cb => {
      addons.push({
        key: cb.dataset.addonKey,
        label: cb.dataset.addonLabel,
        price: parseInt(cb.dataset.addonPrice, 10) || 0
      });
    });
    
    return { name, type, addons };
  });
}

function getSelectedAddons() {
  // Legacy function - now addons are per cat
  const selected = [];
  const catRows = catsContainer?.querySelectorAll('[data-cat-row]') || [];
  
  catRows.forEach((row, idx) => {
    row.querySelectorAll('.cat-addon:checked').forEach(cb => {
      selected.push(cb.dataset.addonLabel || cb.dataset.addonKey);
    });
  });

  return selected;
}

function computeAndRenderTotals() {
  if (serviceInput.value !== 'Grooming') {
    // Cat Hotel pricing: RM15/night (1 cat) + RM5/extra cat per night
    const cats = parseInt(hotelCatCount?.value || '1', 10) || 1;
    const nights = parseInt(hotelNightCount?.value || '1', 10) || 1;
    
    // Formula: first cat = RM15, each extra cat = RM5
    const pricePerNight = 15 + (Math.max(0, cats - 1) * 5);
    const hotelBaseAmount = pricePerNight * nights;
    
    // Include pickup fee if pickup is selected
    const isPickup = arrivalPickup?.checked;
    const pickupTotal = isPickup ? pickupFee : 0;
    const hotelAmount = hotelBaseAmount + pickupTotal;
    
    if (amountInput) amountInput.value = String(hotelAmount);
    computedAmountInput.value = String(hotelAmount);
    
    if (summaryCount) summaryCount.textContent = String(cats);
    if (summaryTotal) summaryTotal.textContent = String(hotelAmount);
    if (hotelTotal) hotelTotal.textContent = String(hotelAmount);
    
    // Update breakdown
    if (hotelBreakdown) {
      let breakdown = `${cats} kucing × ${nights} malam`;
      if (cats > 1) {
        breakdown += ` (RM15 + RM${(cats - 1) * 5} = RM${pricePerNight}/malam)`;
      } else {
        breakdown += ` × RM15/malam`;
      }
      if (isPickup && pickupTotal > 0) {
        breakdown += `<br><i class="bi bi-truck"></i> Pickup: RM${pickupTotal.toFixed(2)}`;
      }
      hotelBreakdown.innerHTML = breakdown;
    }

    const needsPickupFee =
      Boolean(arrivalPickup?.checked) &&
      Boolean(baseLocation?.lat && baseLocation?.lng) &&
      Boolean(profileInfo?.location?.lat && profileInfo?.location?.lng) &&
      Boolean(orsApiKey);

    const hotelReady = Boolean(dateInput?.value) && hotelAmount > 0 && (!needsPickupFee || pickupFeeReady);
    setContinueReady(hotelReady);
    return;
  }

  const typePrice = {
    kitten: 25,
    short_hair: 35,
    long_hair: 45
  };

  const cats = getCatsFromDom();
  const catsCount = cats.length || 0;

  // Calculate base grooming price
  const baseTotal = cats.reduce((sum, c) => {
    return sum + (typePrice[c.type] || 0);
  }, 0);

  // Calculate addon prices
  const addonTotal = cats.reduce((sum, c) => {
    const catAddonSum = (c.addons || []).reduce((s, addon) => s + (addon.price || 0), 0);
    return sum + catAddonSum;
  }, 0);

  // Include pickup fee if pickup is selected
  const isPickup = arrivalPickup?.checked;
  const pickupTotal = isPickup ? pickupFee : 0;
  
  const total = baseTotal + addonTotal + pickupTotal;

  computedAmountInput.value = String(total);

  if (groomingTotal) groomingTotal.textContent = String(total);
  if (summaryCount) summaryCount.textContent = String(catsCount);
  if (summaryTotal) summaryTotal.textContent = String(total);
  
  // Update breakdown list
  if (breakdownList) {
    let breakdownHtml = '';
    cats.forEach((cat, idx) => {
      const catPrice = typePrice[cat.type] || 0;
      const catName = cat.name || `Kucing ${idx + 1}`;
      const typeName = cat.type === 'kitten' ? 'Kitten' : 
                       cat.type === 'short_hair' ? 'Short Hair' : 'Long Hair';
      
      breakdownHtml += `<li>${escapeHtml(catName)} (${typeName}): RM${catPrice}</li>`;
      
      // Add addons for this cat
      (cat.addons || []).forEach(addon => {
        breakdownHtml += `<li class="ms-3">+ ${escapeHtml(addon.label)}: RM${addon.price}</li>`;
      });
    });
    
    // Add pickup fee to breakdown if applicable
    if (isPickup && pickupTotal > 0) {
      breakdownHtml += `<li class="mt-2 fw-semibold"><i class="bi bi-truck"></i> Kos Pickup: RM${pickupTotal.toFixed(2)}</li>`;
    }
    
    breakdownList.innerHTML = breakdownHtml;
  }

  const catsValid =
    catsCount > 0 &&
    cats.every(c => c.name);

  const groomingReady =
    Boolean(dateInput?.value) &&
    catsValid &&
    total > 0 &&
    (!(
      Boolean(arrivalPickup?.checked) &&
      Boolean(baseLocation?.lat && baseLocation?.lng) &&
      Boolean(profileInfo?.location?.lat && profileInfo?.location?.lng) &&
      Boolean(orsApiKey)
    ) || pickupFeeReady);

  setContinueReady(groomingReady);
}

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUser) {
    toast.error('Sila login semula');
    return;
  }

  const service = serviceInput.value;
  const arrival_method = arrivalPickup.checked ? 'pickup' : 'walkin';

  // Validate date (required)
  if (!dateInput.value) {
    toast.warning('Sila pilih tarikh tempahan');
    dateInput.focus();
    return;
  }

  // Validate pickup location
  if (arrival_method === 'pickup') {
    const loc = profileInfo.location;
    if (!loc || !loc.lat || !loc.lng) {
      toast.warning('Sila set lokasi rumah untuk pickup');
      openPickupMapModal();
      return;
    }
  }

  const details = {
    booking_date: dateInput.value || null,
    arrival_method,
    pickup_name: arrival_method === 'pickup' ? (profileInfo.name || null) : null,
    pickup_phone: arrival_method === 'pickup' ? (profileInfo.phone || null) : null,
    pickup_address: arrival_method === 'pickup' ? (profileInfo.address || null) : null,
    pickup_location: arrival_method === 'pickup' ? (profileInfo.location || null) : null,
    pickup_distance_km: arrival_method === 'pickup' ? (pickupDistanceKm ?? null) : null,
    pickup_distance_source: arrival_method === 'pickup' ? (pickupDistanceSource || null) : null,
    pickup_fee: arrival_method === 'pickup' ? (pickupFee ?? null) : null
  };

  let amountValue = 0;

  if (service === 'Grooming') {
    const cats = getCatsFromDom();

    if (!cats.length) {
      toast.warning('Sila tambah sekurang-kurangnya 1 kucing');
      return;
    }

    // Validate each cat has name and type
    for (let i = 0; i < cats.length; i++) {
      if (!cats[i].name) {
        toast.warning(`Sila isi nama untuk kucing ${i + 1}`);
        return;
      }
      if (!cats[i].type) {
        toast.warning(`Sila pilih jenis untuk kucing ${i + 1}`);
        return;
      }
    }

    const addons = getSelectedAddons();

    computeAndRenderTotals();
    amountValue = parseInt(computedAmountInput.value, 10) || 0;

    details.cats = cats;
    details.addons = addons;
    details.note = (noteInput?.value || '').trim() || null;
  } else {
    // Cat Hotel
    const hotelCats = parseInt(hotelCatCount?.value || '1', 10) || 1;
    const hotelNights = parseInt(hotelNightCount?.value || '1', 10) || 1;
    
    computeAndRenderTotals();
    amountValue = parseInt(amountInput?.value || computedAmountInput.value, 10) || 0;

    if (amountValue <= 0) {
      toast.warning('Jumlah tidak sah');
      return;
    }

    details.cat_count = hotelCats;
    details.night_count = hotelNights;
  }

  const bookingData = {
    user_id: currentUser.id,
    service,
    amount: amountValue,
    status: 'pending',
    details
  };

  const { error } =
    await supabaseClient
      .from('bookings')
      .insert(bookingData);

  if (error) {
    toast.error(error.message);
    return;
  }

  toast.success('Booking berjaya dihantar!');
  setTimeout(() => go('customer'), 1500);
});

// Keep total updated for hotel amount too
if (amountInput) {
  amountInput.addEventListener('input', computeAndRenderTotals);
}

if (dateInput) {
  dateInput.addEventListener('change', computeAndRenderTotals);
}

// Store blocked days globally
let blockedDays = [];
let pickerJsInstance = null;

// Fetch blocked days from database
async function fetchBlockedDays() {
  try {
    const { data, error } = await supabaseClient
      .from('blocked_days')
      .select('date');
    
    if (!error && data) {
      blockedDays = data.map(d => d.date);
    }
  } catch (e) {
    console.warn('Could not fetch blocked days:', e);
  }
}

// Get date restrictions
function getDateRestrictions() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2);
  maxDate.setHours(23, 59, 59, 999);
  
  return { minDate: tomorrow, maxDate };
}

// Check if date is blocked
function isDateBlocked(dateStr) {
  return blockedDays.includes(dateStr);
}

function parseYmdToLocalDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function fmtYmdLocal(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clampDateToRange(dt, minDate, maxDate) {
  if (dt < minDate) return new Date(minDate);
  if (dt > maxDate) return new Date(maxDate);
  return dt;
}

function findNextValidDate(startDt, minDate, maxDate) {
  const dt = new Date(startDt);
  dt.setHours(0, 0, 0, 0);

  const limit = 80; // safety (2 months ~ 62 days)
  for (let i = 0; i < limit; i++) {
    if (dt < minDate) {
      dt.setTime(minDate.getTime());
    }
    if (dt > maxDate) return null;
    const ymd = fmtYmdLocal(dt);
    if (!isDateBlocked(ymd)) return dt;
    dt.setDate(dt.getDate() + 1);
  }
  return null;
}

async function setupDatePicker() {
  if (!dateInput) return;

  // Fetch blocked days first
  await fetchBlockedDays();

  const isTouch =
    window.matchMedia?.('(pointer: coarse)').matches ||
    'ontouchstart' in window;

  const { minDate, maxDate } = getDateRestrictions();

  // Touch devices: wheel picker (scroll day/month/year)
  if (isTouch) {
    // Use our custom wheel picker so min/max is truly enforced in UI
    // (PickerJS does not support hard min/max constraints while scrolling)
    setupWheelDatePicker();
    return;
  }

  // Desktop: calendar popup
  if (typeof window.flatpickr === 'function') {
    window.flatpickr(dateInput, {
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd M Y',
      allowInput: false,
      disableMobile: true,
      minDate: minDate,
      maxDate: maxDate,
      disable: blockedDays.map(d => d), // Disable blocked days
      onChange: () => computeAndRenderTotals()
    });
  }
}

function setupPickerJsDatePicker(minDate, maxDate) {
  // Prefer PickerJS (wheel-style), fallback to our custom wheel picker
  if (typeof window.Picker !== 'function') {
    setupWheelDatePicker();
    return;
  }

  // Prevent manual typing on mobile
  dateInput.readOnly = true;

  // Initial date: keep existing if valid, else clamp to min and skip blocked days
  const existing = parseYmdToLocalDate(dateInput.value);
  let initial = clampDateToRange(existing || minDate, minDate, maxDate);
  initial = findNextValidDate(initial, minDate, maxDate) || minDate;

  // Destroy previous instance (if any)
  try { pickerJsInstance?.destroy?.(); } catch (_) {}
  pickerJsInstance = null;

  pickerJsInstance = new window.Picker(dateInput, {
    format: 'YYYY-MM-DD',
    date: initial,
    rows: 5,
    headers: true,
    text: {
      title: 'Pilih tarikh',
      cancel: 'Batal',
      confirm: 'Siap',
      year: 'Tahun',
      month: 'Bulan',
      day: 'Hari'
    },
    monthsShort: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'],
    pick() {
      // Validate after pick, then auto-correct to nearest valid date
      const picked = pickerJsInstance?.getDate?.() || null;
      if (!picked) return;

      const dt = new Date(picked);
      dt.setHours(0, 0, 0, 0);
      const clamped = clampDateToRange(dt, minDate, maxDate);
      const valid = findNextValidDate(clamped, minDate, maxDate);

      if (!valid) {
        toast.warning('Tiada tarikh tersedia dalam tempoh ini.');
        dateInput.value = '';
        computeAndRenderTotals();
        return;
      }

      const ymd = fmtYmdLocal(valid);
      if (ymd !== fmtYmdLocal(dt) || isDateBlocked(fmtYmdLocal(dt))) {
        toast.warning('Tarikh ini tidak tersedia. Saya pilih tarikh paling dekat yang available.');
      }

      pickerJsInstance.setDate(valid);
      pickerJsInstance.pick();
      computeAndRenderTotals();
    }
  });
}

function setupWheelDatePicker() {
  if (!dateInput || !dateOverlay || !dateSheet) return;
  if (!wheelDay || !wheelMonth || !wheelYear) return;

  // Prevent keyboard on mobile
  dateInput.readOnly = true;

  const monthNames = [
    'Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'
  ];

  // Use date restrictions (tomorrow to 2 months)
  const { minDate, maxDate } = getDateRestrictions();
  const min = minDate;
  const startYear = min.getFullYear();
  const endYear = maxDate.getFullYear();
  const minMonth = min.getMonth();
  const maxMonth = maxDate.getMonth();
  const minDay = min.getDate();
  const maxDay = maxDate.getDate();

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  // Get valid months for a given year
  function getValidMonths(year) {
    let start = 0;
    let end = 11;
    
    if (year === startYear) {
      start = minMonth; // Can't pick months before min month in start year
    }
    if (year === endYear) {
      end = maxMonth; // Can't pick months after max month in end year
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // Get valid days for a given year and month
  function getValidDays(year, monthIndex) {
    const maxD = daysInMonth(year, monthIndex);
    let startDay = 1;
    let endDay = maxD;
    
    // If this is the min month in min year, start from min day
    if (year === startYear && monthIndex === minMonth) {
      startDay = minDay;
    }

    // If this is the max month in max year, end at max day
    if (year === endYear && monthIndex === maxMonth) {
      endDay = Math.min(endDay, maxDay);
    }
    
    // Safety: if range invalid, return at least [startDay]
    if (endDay < startDay) return [startDay];

    return Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);
  }

  function parseYmd(value) {
    const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(y, mo, d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  function fmtYmd(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function buildList(container, items, getValue, getLabel) {
    container.innerHTML = '';
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'ak-wheel-item';
      div.dataset.value = String(getValue(item));
      div.textContent = String(getLabel(item));
      container.appendChild(div);
    });
  }

  function snapTo(container, value) {
    const el = container.querySelector(`[data-value="${CSS.escape(String(value))}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    setActive(container);
  }

  function getCenteredValue(container) {
    const rect = container.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const children = [...container.querySelectorAll('.ak-wheel-item')];
    let best = null;
    let bestDist = Infinity;
    for (const c of children) {
      const r = c.getBoundingClientRect();
      const cy = r.top + r.height / 2;
      const dist = Math.abs(cy - centerY);
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    return best?.dataset.value ?? null;
  }

  function setActive(container) {
    const activeVal = getCenteredValue(container);
    container.querySelectorAll('.ak-wheel-item').forEach(el => {
      el.classList.toggle('is-active', el.dataset.value === activeVal);
    });
  }

  function clampToRange(dt) {
    if (dt < min) return new Date(min);
    if (dt > maxDate) return new Date(maxDate);
    return dt;
  }

  function rebuildDaysFor(year, monthIndex, preferredDay) {
    const validDays = getValidDays(year, monthIndex);
    buildList(wheelDay, validDays, d => d, d => d);
    
    // Clamp preferred day to valid range
    const minValidDay = validDays[0];
    const maxValidDay = validDays[validDays.length - 1];
    const day = Math.max(minValidDay, Math.min(preferredDay, maxValidDay));
    snapTo(wheelDay, day);
  }

  function rebuildMonthsFor(year, preferredMonth) {
    const validMonths = getValidMonths(year);
    buildList(wheelMonth, validMonths, i => i, i => monthNames[i]);
    
    // Clamp preferred month to valid range
    const minValidMonth = validMonths[0];
    const maxValidMonth = validMonths[validMonths.length - 1];
    const month = Math.max(minValidMonth, Math.min(preferredMonth, maxValidMonth));
    snapTo(wheelMonth, month);
    return month;
  }

  // Build years (static)
  buildList(
    wheelYear,
    Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
    y => y,
    y => y
  );

  // Build initial months for start year
  rebuildMonthsFor(startYear, minMonth);

  let selected = clampToRange(parseYmd(dateInput.value) || min);

  function syncFromSelected() {
    snapTo(wheelYear, selected.getFullYear());
    rebuildMonthsFor(selected.getFullYear(), selected.getMonth());
    rebuildDaysFor(selected.getFullYear(), selected.getMonth(), selected.getDate());
  }

  function readFromWheels() {
    const y = parseInt(getCenteredValue(wheelYear) || `${startYear}`, 10);
    const m = parseInt(getCenteredValue(wheelMonth) ?? `${minMonth}`, 10);
    const d = parseInt(getCenteredValue(wheelDay) || `${minDay}`, 10);
    return clampToRange(new Date(y, m, d));
  }

  function openSheet() {
    selected = clampToRange(parseYmd(dateInput.value) || selected);
    syncFromSelected();

    dateOverlay.classList.remove('d-none');
    dateSheet.classList.remove('d-none');
    dateOverlay.setAttribute('aria-hidden', 'false');

    // lock background scroll
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    dateOverlay.classList.add('d-none');
    dateSheet.classList.add('d-none');
    dateOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  let scrollTimer = null;
  function onWheelScroll(container) {
    setActive(container);
    if (scrollTimer) window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      const next = readFromWheels();
      const yearChanged = next.getFullYear() !== selected.getFullYear();
      const monthChanged = next.getMonth() !== selected.getMonth();
      
      // If year changed, rebuild months list first
      if (yearChanged) {
        const prevMonth = next.getMonth();
        const validMonth = rebuildMonthsFor(next.getFullYear(), prevMonth);
        // Update next with valid month
        next.setMonth(validMonth);
      }
      
      // If month or year changed, rebuild days
      if (yearChanged || monthChanged) {
        const prevDay = next.getDate();
        selected = next;
        rebuildDaysFor(selected.getFullYear(), selected.getMonth(), prevDay);
      } else {
        selected = next;
      }
      
      setActive(wheelDay);
      setActive(wheelMonth);
      setActive(wheelYear);
    }, 120);
  }

  wheelDay.addEventListener('scroll', () => onWheelScroll(wheelDay), { passive: true });
  wheelMonth.addEventListener('scroll', () => onWheelScroll(wheelMonth), { passive: true });
  wheelYear.addEventListener('scroll', () => onWheelScroll(wheelYear), { passive: true });

  dateInput.addEventListener('click', openSheet);
  dateOverlay.addEventListener('click', closeSheet);
  dateCancelBtn?.addEventListener('click', closeSheet);
  dateDoneBtn?.addEventListener('click', () => {
    selected = readFromWheels();
    const dateStr = fmtYmd(selected);
    
    // Check if date is blocked
    if (isDateBlocked(dateStr)) {
      toast.warning('Tarikh ini tidak tersedia. Sila pilih tarikh lain.');
      return;
    }
    
    // Check if date is within allowed range
    const { minDate: minD, maxDate: maxD } = getDateRestrictions();
    if (selected < minD || selected > maxD) {
      toast.warning('Sila pilih tarikh dalam tempoh 2 bulan dari hari ini.');
      return;
    }
    
    dateInput.value = dateStr;
    computeAndRenderTotals();
    closeSheet();
  });

  // Initial state
  syncFromSelected();
}
