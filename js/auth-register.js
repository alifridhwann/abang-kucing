const registerForm = document.getElementById('registerForm');
const errorBox = document.getElementById('registerError');

document.addEventListener('DOMContentLoaded', redirectIfLoggedIn);

async function redirectIfLoggedIn() {
  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  if (!sessionData.session) return;

  const { data: profile } =
    await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', sessionData.session.user.id)
      .maybeSingle();

  if (profile?.role === 'admin') {
    goReplace('admin');
    return;
  }

  goReplace('customer');
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  errorBox.textContent = '';

  const shortName =
    document.getElementById('regName').value.trim();
  const address =
    document.getElementById('regAddress').value.trim();
  const email =
    document.getElementById('regEmail').value.trim();
  const password =
    document.getElementById('regPassword').value;

  if (!shortName || !address) {
    errorBox.textContent =
      'Sila isi nama pendek dan tempat tinggal.';
    return;
  }

  const { data, error } =
    await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: shortName,
          address
        }
      }
    });

  if (error) {
    errorBox.textContent = error.message;
    return;
  }

  // Get user ID - dari session atau dari data.user (bila email confirmation enabled)
  const userId = data?.session?.user?.id || data?.user?.id;

  if (userId) {
    const payload = {
      id: userId,
      email,
      role: 'customer',
      name: shortName,
      address
    };

    let { error: profileError } =
      await supabaseClient
        .from('profiles')
        .upsert(payload);

    // Fallback jika schema `profiles` belum ada kolum tertentu (cth: address)
    if (profileError && /address/i.test(profileError.message || '')) {
      const payload2 = { ...payload };
      delete payload2.address;

      const res2 =
        await supabaseClient
          .from('profiles')
          .upsert(payload2);

      profileError = res2.error;
    }

    if (profileError) {
      errorBox.textContent =
        'Gagal simpan profil: ' +
        profileError.message;
      return;
    }
  }

  // Show success message
  if (!data?.session) {
    // Email confirmation enabled - user needs to verify email
    toast.success('Berjaya daftar! Sila check email untuk pengesahan.');
  }

  go('login');
});
