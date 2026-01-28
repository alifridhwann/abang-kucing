const resetForm = document.getElementById('resetForm');
const newPasswordInput = document.getElementById('newPassword');
const resetError = document.getElementById('resetError');

function setError(message) {
  if (resetError) resetError.textContent = message || '';
}

async function requireRecoverySession() {
  // Supabase biasanya akan auto-create session dari URL hash
  // (detectSessionInUrl: true dalam `js/supabase.js`).
  const { data } = await supabaseClient.auth.getSession();
  return data.session || null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireRecoverySession();

  if (!session) {
    setError('Link reset tidak sah atau telah tamat. Sila minta semula.');
    if (resetForm) {
      [...resetForm.elements].forEach(el => {
        el.disabled = true;
      });
    }
  }
});

if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');

    const password = (newPasswordInput?.value || '').trim();

    if (password.length < 6) {
      setError('Password minimum 6 aksara.');
      return;
    }

    const session = await requireRecoverySession();
    if (!session) {
      setError('Session reset tidak dijumpai. Sila buka link dari email semula.');
      return;
    }

    const { error } =
      await supabaseClient.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      return;
    }

    await supabaseClient.auth.signOut();
    toast.success('Password berjaya ditukar. Sila login semula.');
    setTimeout(() => go('login'), 1500);
  });
}
