/* =====================================================
   AUTH LOGIN – ULTIMATE FIX
   - Login Supabase
   - Pastikan session wujud
   - AUTO CREATE PROFILE JIKA TIADA
   - Redirect ikut role
   ===================================================== */

const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1️⃣ LOGIN
  const { error: loginError } =
    await supabaseClient.auth.signInWithPassword({
      email: loginEmail.value.trim(),
      password: loginPassword.value
    });

  if (loginError) {
    alert(loginError.message);
    return;
  }

  // 2️⃣ GET SESSION USER (WAJIB)
  const { data: userData } =
    await supabaseClient.auth.getUser();

  if (!userData || !userData.user) {
    alert('Session tidak wujud. Sila refresh & login semula.');
    return;
  }

  const user = userData.user;

  // 3️⃣ CUBA AMBIL PROFILE
  let { data: profile, error: profileErr } =
    await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

  // 4️⃣ JIKA PROFILE TIADA → AUTO CREATE (SAFE FALLBACK)
  if (!profile) {
    const { error: insertErr } =
      await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          role: 'customer'
        });

    if (insertErr) {
      alert('Gagal create profile: ' + insertErr.message);
      return;
    }

    // ambil semula profile
    const res =
      await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    profile = res.data;
  }

  // 5️⃣ REDIRECT IKUT ROLE
  if (profile.role === 'admin') {
    location.replace('admin.html');
  } else {
    location.replace('customer.html');
  }
});
