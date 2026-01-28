const forgotForm = document.getElementById('forgotForm');
const forgotEmail = document.getElementById('forgotEmail');

if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (forgotEmail?.value || '').trim();

    if (!email) {
      toast.warning('Sila masukkan email');
      return;
    }

    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: window.location.origin + '/reset-password'
        }
      );

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Email reset password telah dihantar');
  });
}
