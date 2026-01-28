document.getElementById('forgotForm').onsubmit = (e) => {
  e.preventDefault();

  const email = forgotEmail.value.trim().toLowerCase();
  const users = JSON.parse(localStorage.getItem('users')) || [];

  const user = users.find(u => u.email === email);

  if (!user) {
    alert('Email tidak dijumpai');
    return;
  }

  // token sah 10 minit
  const token = crypto.randomUUID();
  const resetData = {
    email,
    token,
    expires: Date.now() + (10 * 60 * 1000)
  };

  localStorage.setItem('passwordReset', JSON.stringify(resetData));

  alert(
    'Reset link (demo):\n\n' +
    'reset-password?token=' + token
  );
};
