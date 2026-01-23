/* =====================================================
   BOOKING SUBMIT – FINAL (RLS SAFE)
   ===================================================== */

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const { data: userData } =
    await supabaseClient.auth.getUser();

  if (!userData || !userData.user) {
    alert('Sila login semula');
    return;
  }

  const user = userData.user;

  const bookingData = {
    user_id: user.id,          // 🔥 WAJIB
    service: service.value,
    amount: parseInt(amount.value),
    status: 'pending'
  };

  const { error } =
    await supabaseClient
      .from('bookings')
      .insert(bookingData);

  if (error) {
    alert(error.message);
    return;
  }

  alert('Booking berjaya dihantar');
  location.href = 'customer.html';
});
