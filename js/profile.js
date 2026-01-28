/* =====================================================
   PROFILE – SUPABASE (RLS SAFE) + LOCATION PICKER
   - Read/write table `profiles`
   - Leaflet map for pinpoint location
   ===================================================== */

const profileForm = document.getElementById('profileForm');
const nameInput = document.getElementById('profileName');
const phoneInput = document.getElementById('profilePhone');
const addressInput = document.getElementById('profileKampung');
const latInput = document.getElementById('profileLat');
const lngInput = document.getElementById('profileLng');
const locationPreview = document.getElementById('locationPreview');
const locationText = document.getElementById('locationText');
const pickLocationBtn = document.getElementById('pickLocationBtn');
const mapModal = document.getElementById('mapModal');
const mapCloseBtn = document.getElementById('mapCloseBtn');
const mapConfirmBtn = document.getElementById('mapConfirmBtn');

let currentUser = null;
let map = null;
let marker = null;
let tempLat = null;
let tempLng = null;

// Default location: Terengganu, Malaysia
const DEFAULT_LAT = 5.3117;
const DEFAULT_LNG = 103.1324;

document.addEventListener('DOMContentLoaded', initProfile);

async function initProfile() {
  const { data: userData } = await supabaseClient.auth.getUser();

  if (!userData?.user) {
    go('login');
    return;
  }

  currentUser = userData.user;
  const userMeta = currentUser.user_metadata || {};

  // Try read with all columns (fallback if column doesn't exist)
  let profile = null;
  {
    const res = await supabaseClient
      .from('profiles')
      .select('name, address, phone, location')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!res.error) {
      profile = res.data;
    } else {
      // Fallback: try without location
      const res2 = await supabaseClient
        .from('profiles')
        .select('name, address, phone')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!res2.error) {
        profile = res2.data;
      } else {
        // Fallback: try with just name
        const res3 = await supabaseClient
          .from('profiles')
          .select('name')
          .eq('id', currentUser.id)
          .maybeSingle();

        profile = res3.data || null;
      }
    }
  }

  if (nameInput) {
    nameInput.value = profile?.name || userMeta.name || '';
  }

  if (addressInput) {
    addressInput.value = profile?.address || userMeta.address || '';
  }

  if (phoneInput) {
    phoneInput.value = profile?.phone || userMeta.phone || '';
  }

  // Load saved location
  if (profile?.location) {
    const loc = typeof profile.location === 'string' 
      ? JSON.parse(profile.location) 
      : profile.location;
    
    if (loc?.lat && loc?.lng) {
      latInput.value = loc.lat;
      lngInput.value = loc.lng;
      updateLocationUI(loc.lat, loc.lng);
    }
  }
}

function updateLocationUI(lat, lng) {
  locationPreview.classList.add('has-location');
  locationText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// Map picker
if (pickLocationBtn) {
  pickLocationBtn.addEventListener('click', openMapModal);
}

if (mapCloseBtn) {
  mapCloseBtn.addEventListener('click', closeMapModal);
}

if (mapConfirmBtn) {
  mapConfirmBtn.addEventListener('click', confirmLocation);
}

function openMapModal() {
  mapModal.classList.remove('d-none');
  mapConfirmBtn.disabled = true;

  // Initialize map if not already
  setTimeout(() => {
    if (!map) {
      // Start at saved location or default
      const startLat = parseFloat(latInput.value) || DEFAULT_LAT;
      const startLng = parseFloat(lngInput.value) || DEFAULT_LNG;

      map = L.map('map').setView([startLat, startLng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // If already have location, show marker
      if (latInput.value && lngInput.value) {
        marker = L.circleMarker([startLat, startLng], {
          radius: 10,
          fillColor: '#3F51B5',
          color: '#fff',
          weight: 3,
          fillOpacity: 1
        }).addTo(map);
        tempLat = startLat;
        tempLng = startLng;
        mapConfirmBtn.disabled = false;
      }

      // Click handler
      map.on('click', onMapClick);
    } else {
      map.invalidateSize();
    }
  }, 100);
}

function onMapClick(e) {
  const { lat, lng } = e.latlng;
  tempLat = lat;
  tempLng = lng;

  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.circleMarker([lat, lng], {
      radius: 10,
      fillColor: '#3F51B5',
      color: '#fff',
      weight: 3,
      fillOpacity: 1
    }).addTo(map);
  }

  mapConfirmBtn.disabled = false;
}

function closeMapModal() {
  mapModal.classList.add('d-none');
}

function confirmLocation() {
  if (tempLat && tempLng) {
    latInput.value = tempLat;
    lngInput.value = tempLng;
    updateLocationUI(tempLat, tempLng);
  }
  closeMapModal();
}

// Form submit
if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error('Sila login semula');
      setTimeout(() => go('login'), 1500);
      return;
    }

    // Validate phone (if provided)
    const phoneVal = (phoneInput?.value || '').trim();
    if (phoneVal && typeof isValidPhone === 'function' && !isValidPhone(phoneVal)) {
      toast.error('Format nombor telefon tidak sah. Contoh: 0123456789');
      return;
    }

    // Build location object
    let location = null;
    if (latInput.value && lngInput.value) {
      location = {
        lat: parseFloat(latInput.value),
        lng: parseFloat(lngInput.value)
      };
    }

    const payload = {
      id: currentUser.id,
      email: currentUser.email,
      role: 'customer',
      name: (nameInput?.value || '').trim() || null,
      address: (addressInput?.value || '').trim() || null,
      phone: (phoneInput?.value || '').trim() || null,
      location: location
    };

    let { error } = await supabaseClient.from('profiles').upsert(payload);

    // Fallback if columns don't exist
    if (error) {
      const errMsg = error.message || '';
      const payload2 = { ...payload };

      if (/location/i.test(errMsg)) delete payload2.location;
      if (/phone/i.test(errMsg)) delete payload2.phone;
      if (/address/i.test(errMsg)) delete payload2.address;

      const res2 = await supabaseClient.from('profiles').upsert(payload2);
      error = res2.error;

      // If still failing, try minimal
      if (error) {
        const payload3 = {
          id: currentUser.id,
          email: currentUser.email,
          role: 'customer',
          name: payload.name
        };

        const res3 = await supabaseClient.from('profiles').upsert(payload3);
        error = res3.error;
      }
    }

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Profil berjaya dikemaskini');
    setTimeout(() => go('customer'), 1500);
  });
}
