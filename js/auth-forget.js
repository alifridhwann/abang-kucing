forgotForm.onsubmit = async (e) => {
  e.preventDefault();

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(
      forgotEmail.value,
      {
        redirectTo: window.location.origin + '/reset-password.html'
      }
    );

  if (error) {
    alert(error.message);
    return;
  }

  alert('Email reset password telah dihantar');
};
