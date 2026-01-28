(async () => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  
  if (!sessionData?.session?.user) {
    go('login');
    return;
  }

  const { data, error } = await supabaseClient
    .from('bookings')
    .select('*')
    .eq('user_id', sessionData.session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const contentEl = document.getElementById('invoiceContent');
  const emptyEl = document.getElementById('emptyState');

  if (!data || error) {
    contentEl.classList.add('d-none');
    emptyEl.classList.remove('d-none');
    return;
  }

  // Format status
  const statusMap = {
    pending: 'Menunggu',
    confirmed: 'Disahkan',
    cancelled: 'Dibatalkan'
  };

  document.getElementById('invService').textContent = data.service || '-';
  document.getElementById('invAmount').textContent = `RM${data.amount || 0}`;
  document.getElementById('invStatus').textContent = statusMap[data.status] || data.status;
})();
