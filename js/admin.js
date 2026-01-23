/* =====================================================
   ADMIN.JS – CONFIRM BOOKING
   ===================================================== */

const user = JSON.parse(localStorage.getItem('currentUser'));
if (!user || user.role !== 'admin') location.href = 'login.html';

let bookings = JSON.parse(localStorage.getItem('bookings')) || [];
const list = document.getElementById('adminBookingList');

if (!bookings.length) {
  list.innerHTML = `
    <div class="card p-4 text-center">
      Tiada tempahan lagi
    </div>
  `;
} else {
  list.innerHTML = '';

  bookings.reverse().forEach((b, i) => {
    let badge = 'secondary';
    if (b.status === 'pending') badge = 'warning';
    if (b.status === 'confirmed') badge = 'success';
    if (b.status === 'cancelled') badge = 'danger';

    list.innerHTML += `
      <div class="card p-3 mb-3">
        <div class="d-flex justify-content-between mb-2">
          <strong>${b.customer.name}</strong>
          <span class="badge bg-${badge}">
            ${b.status}
          </span>
        </div>

        <div class="small text-muted">
          Servis: ${b.service}<br>
          Jumlah: RM${b.amount}<br>
          Tarikh Tempahan: ${b.createdAt}
        </div>

        <div class="mt-3 d-flex gap-2">
          ${b.status === 'pending'
            ? `<button
                class="btn btn-sm btn-success"
                onclick="updateStatus(${i}, 'confirmed')">
                Confirm
              </button>`
            : ''}

          ${b.status !== 'cancelled'
            ? `<button
                class="btn btn-sm btn-outline-danger"
                onclick="updateStatus(${i}, 'cancelled')">
                Cancel
              </button>`
            : ''}
        </div>
      </div>
    `;
  });
}

function updateStatus(index, status) {
  bookings[index].status = status;
  localStorage.setItem('bookings', JSON.stringify(bookings));
  location.reload();
}
