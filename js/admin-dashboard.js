(async () => {
  const { data, error } =
    await supabaseClient.from('bookings').select('*');

  if (error) {
    toast.error(error.message);
    return;
  }

  document.getElementById('totalBooking').textContent =
    data.length;

  document.getElementById('totalSales').textContent =
    data.reduce((sum, b) => sum + b.amount, 0);

  const today =
    new Date().toISOString().split('T')[0];

  document.getElementById('todayBooking').textContent =
    data.filter(b =>
      b.created_at.startsWith(today)
    ).length;
})();
