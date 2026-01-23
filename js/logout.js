async function logout() {
  await supabaseClient.auth.signOut();
  location.href = 'login.html';
}
