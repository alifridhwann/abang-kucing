async function logout() {
  await supabaseClient.auth.signOut();
  go('login');
}
