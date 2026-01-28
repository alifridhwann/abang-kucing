async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

document.getElementById('registerForm').onsubmit = async (e) => {
  e.preventDefault();

  const name = regName.value.trim();
  const email = regEmail.value.trim().toLowerCase();
  const passwordHash = await hashPassword(regPassword.value);

  const users = JSON.parse(localStorage.getItem('users')) || [];

  if (users.find(u => u.email === email)) {
    alert('Email sudah digunakan');
    return;
  }

  users.push({
    id: Date.now(),
    name,
    email,
    passwordHash,
    role: 'customer'
  });

  localStorage.setItem('users', JSON.stringify(users));
  alert('Pendaftaran berjaya');
  go('login');
};
