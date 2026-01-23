(async () => {
  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const { data } =
    await supabaseClient
      .from('bookings')
      .select('*')
      .eq('user_id', sessionData.session.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

  document.getElementById('invService').textContent = data.service;
  document.getElementById('invAmount').textContent = data.amount;
  document.getElementById('invStatus').textContent = data.status;
})();
