const user = JSON.parse(localStorage.getItem('currentUser'));
if (!user) location.href = 'login.html';

/* ===== LOAD PROFILE ===== */
document.getElementById('name').value = user.name || '';
document.getElementById('phone').value = user.phone || '';
document.getElementById('kampung').value = user.kampung || '';
document.getElementById('email').value = user.email || user.username;

/* ===== SAVE PROFILE ===== */
profileForm.onsubmit = e => {
  e.preventDefault();

  user.name = name.value.trim();
  user.phone = phone.value.trim();
  user.kampung = kampung.value.trim();

  // Update user list
  const users = JSON.parse(localStorage.getItem('users')) || [];
  const index = users.findIndex(u => u.username === user.username);

  if (index !== -1) {
    users[index] = user;
    localStorage.setItem('users', JSON.stringify(users));
  }

  // Update session
  localStorage.setItem('currentUser', JSON.stringify(user));

  alert('Profil berjaya dikemaskini');
};

/* ===== LOGOUT ===== */
function logout() {
  if (!confirm('Log keluar dari akaun?')) return;

  localStorage.removeItem('currentUser');
  location.href = 'login.html';
}
