/* =====================================================
   AUTH GUARD – ADMIN ONLY
   ===================================================== */

(async () => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  
  if (!sessionData?.session) {
    goReplace('login');
    return;
  }

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', sessionData.session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Auth guard error:', error.message);
    goReplace('login');
    return;
  }

  if (!profile || profile.role !== 'admin') {
    goReplace('customer');
    return;
  }

  // User is admin, allow access
})();
