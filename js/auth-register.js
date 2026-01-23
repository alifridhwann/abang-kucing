const registerForm = document.getElementById('registerForm');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');

registerForm.addEventListener('submit', async e => {
  e.preventDefault();

  const { error } =
    await supabaseClient.auth.signUp({
      email: regEmail.value,
      password: regPassword.value
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert('Daftar berjaya. Sila login.');
  location.href = 'login.html';
});
