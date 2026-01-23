(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    location.href = 'login.html';
  }
})();
