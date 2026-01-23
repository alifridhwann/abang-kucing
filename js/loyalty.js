/* =====================================================
   LOYALTY FRONTEND – READ ONLY (RLS SAFE)
   ===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // pastikan user login
  const { data: userData, error: userErr } =
    await supabaseClient.auth.getUser();

  if (userErr || !userData || !userData.user) {
    alert('Sila login semula');
    location.href = 'login.html';
    return;
  }

  // baca loyalty point (RLS akan tapis user sendiri)
  const { data, error } =
    await supabaseClient
      .from('loyalty_points')
      .select('points')
      .single();

  if (error) {
    // jika belum ada row loyalty_points
    document.getElementById('pointBalance').textContent = '0';
    return;
  }

  document.getElementById('pointBalance').textContent =
    data.points ?? 0;
});
