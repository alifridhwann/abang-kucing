document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errorBox = document.getElementById('registerError');
  errorBox.textContent = '';

  const email = regEmail.value.trim();
  const password = regPassword.value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    errorBox.textContent = error.message;
    return;
  }

  // Success
  location.href = 'login.html';
});
