(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    location.href = 'login.html';
    return;
  }

  const { data: profile } =
    await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', data.session.user.id)
      .single();

  if (profile.role !== 'admin') {
    location.href = 'customer.html';
  }
})();
