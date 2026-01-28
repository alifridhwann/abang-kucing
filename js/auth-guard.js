(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    go('login');
  }
})();
