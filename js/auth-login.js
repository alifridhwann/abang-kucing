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

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get submit button and show loading
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';

  // 1️⃣ LOGIN
  const { error: loginError } =
    await supabaseClient.auth.signInWithPassword({
      email: loginEmail.value.trim(),
      password: loginPassword.value
    });

  if (loginError) {
    toast.error(loginError.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    return;
  }

  // 2️⃣ GET SESSION USER (WAJIB)
  const { data: userData } =
    await supabaseClient.auth.getUser();

  if (!userData || !userData.user) {
    toast.error('Session tidak wujud. Sila refresh & login semula.');
    return;
  }

  const user = userData.user;
  const userMeta = user.user_metadata || {};
  const metaName = userMeta.name || '';
  const metaAddress = userMeta.address || '';

  // 3️⃣ CUBA AMBIL PROFILE (fallback jika schema belum ada kolum)
  let profile = null;
  {
    const res =
      await supabaseClient
        .from('profiles')
        .select('role, name, address')
        .eq('id', user.id)
        .maybeSingle();

    if (!res.error) {
      profile = res.data;
    } else if (/address/i.test(res.error.message || '')) {
      const res2 =
        await supabaseClient
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .maybeSingle();

      if (res2.error) {
        toast.error('Gagal ambil profile: ' + res2.error.message);
        return;
      }

      profile = res2.data;
    } else {
      toast.error('Gagal ambil profile: ' + res.error.message);
      return;
    }
  }

  // 4️⃣ JIKA PROFILE TIADA → AUTO CREATE (SAFE FALLBACK)
  if (!profile) {
    const insertPayload = {
      id: user.id,
      email: user.email,
      role: 'customer',
      name: metaName || null,
      address: metaAddress || null
    };

    let { error: insertErr } =
      await supabaseClient
        .from('profiles')
        .insert(insertPayload);

    if (insertErr && /address/i.test(insertErr.message || '')) {
      const insertPayload2 = { ...insertPayload };
      delete insertPayload2.address;

      const res2 =
        await supabaseClient
          .from('profiles')
          .insert(insertPayload2);

      insertErr = res2.error;
    }

    if (insertErr) {
      toast.error('Gagal create profile: ' + insertErr.message);
      return;
    }

    // ambil semula profile (dengan fallback)
    const res3 =
      await supabaseClient
        .from('profiles')
        .select('role, name, address')
        .eq('id', user.id)
        .maybeSingle();

    if (!res3.error) {
      profile = res3.data;
    } else {
      const res4 =
        await supabaseClient
          .from('profiles')
          .select('role, name')
          .eq('id', user.id)
          .maybeSingle();

      profile = res4.data;
    }
  } else {
    const updates = {};

    if (!profile.name && metaName) {
      updates.name = metaName;
    }

    if (metaAddress) {
      // hanya cuba set address jika schema support
      updates.address = metaAddress;
    }

    if (Object.keys(updates).length) {
      let resU =
        await supabaseClient
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

      if (resU.error && /address/i.test(resU.error.message || '')) {
        const updates2 = { ...updates };
        delete updates2.address;

        if (Object.keys(updates2).length) {
          resU =
            await supabaseClient
              .from('profiles')
              .update(updates2)
              .eq('id', user.id);
        }
      }
    }
  }

  // 5️⃣ REDIRECT IKUT ROLE
  if (!profile || !profile.role) {
    toast.error('Gagal ambil maklumat pengguna. Sila cuba semula.');
    return;
  }

  if (profile.role === 'admin') {
    goReplace('admin');
  } else {
    goReplace('customer');
  }
});
