async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

const resetData = JSON.parse(localStorage.getItem('passwordReset'));

if (!resetData || resetData.token !== token || Date.now() > resetData.expires) {
  alert('Link reset tidak sah atau telah tamat');
    go('login');
}

document.getElementById('resetForm').onsubmit = async (e) => {
  e.preventDefault();

  const users = JSON.parse(localStorage.getItem('users')) || [];
  const user = users.find(u => u.email === resetData.email);

  if (!user) {
    alert('User tidak dijumpai');
    return;
  }

  user.passwordHash = await hashPassword(newPassword.value);

  localStorage.setItem('users', JSON.stringify(users));
  localStorage.removeItem('passwordReset');

  alert('Password berjaya ditukar');
  go('login');
};
