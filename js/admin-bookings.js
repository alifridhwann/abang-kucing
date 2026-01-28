const tbody = document.getElementById('bookingTable');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

let allBookings = [];

loadBookings();

async function loadBookings() {
  const { data, error } =
    await supabaseClient
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

  if (error) {
    toast.error(error.message);
    return;
  }

  allBookings = data;
  renderTable(data);
}

function renderTable(list) {
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" class="text-center text-muted">
        Tiada booking
      </td></tr>`;
    return;
  }

  list.forEach(b => {
    tbody.innerHTML += `
      <tr>
        <td>${new Date(b.created_at).toLocaleString()}</td>
        <td>${b.service}</td>
        <td>RM${b.amount}</td>
        <td>
          <span class="badge ${
            b.status === 'approved' ? 'bg-success' :
            b.status === 'rejected' ? 'bg-danger' :
            'bg-warning text-dark'
          }">${b.status}</span>
        </td>
        <td>
          ${
            b.status === 'pending'
              ? `
                <button class="btn btn-sm btn-success me-1"
                  onclick="approveBooking('${b.id}')">
                  Approve
                </button>
                <button class="btn btn-sm btn-danger"
                  onclick="updateStatus('${b.id}','rejected')">
                  Reject
                </button>
              `
              : '-'
          }
        </td>
      </tr>
    `;
  });
}

function applyFilter() {
  const keyword = searchInput.value.toLowerCase();
  const status = statusFilter.value;

  const filtered = allBookings.filter(b =>
    (!status || b.status === status) &&
    (b.service.toLowerCase().includes(keyword) ||
     b.status.toLowerCase().includes(keyword))
  );

  renderTable(filtered);
}

async function approveBooking(id) {
  if (!confirm('Approve booking ini?')) return;

  const { data: booking } =
    await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

  await supabaseClient
    .from('bookings')
    .update({ status: 'approved' })
    .eq('id', id);

  // WhatsApp auto open
  const msg = `
Hai 👋
Tempahan anda telah DILULUSKAN ✅

Servis: ${booking.service}
Jumlah: RM${booking.amount}

Terima kasih,
Abang Kucing 🐾
`;

  if (booking.details?.phone) {
    window.open(
      'https://wa.me/6' +
      booking.details.phone.replace(/\D/g,'') +
      '?text=' + encodeURIComponent(msg),
      '_blank'
    );
  }

  loadBookings();
}

async function updateStatus(id, status) {
  if (!confirm('Reject booking ini?')) return;

  await supabaseClient
    .from('bookings')
    .update({ status })
    .eq('id', id);

  loadBookings();
}
