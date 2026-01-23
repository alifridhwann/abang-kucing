(async () => {
  const { data } =
    await supabaseClient
      .from('redeem_requests')
      .select(`
        id, item, cost, status,
        profiles(email)
      `);

  const tbody = document.getElementById('redeemTable');
  tbody.innerHTML = '';

  data.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.profiles.email}</td>
        <td>${r.item}</td>
        <td>${r.cost}</td>
        <td>${r.status}</td>
        <td>
          <button class="btn btn-success btn-sm"
            onclick="approve('${r.id}',${r.cost})">
            Approve
          </button>
        </td>
      </tr>
    `;
  });
})();

async function approve(id, cost) {
  const code = 'AK-' + Math.random().toString(36).substring(2,8).toUpperCase();

  await supabaseClient
    .from('redeem_requests')
    .update({
      status: 'approved',
      code
    })
    .eq('id', id);

  location.reload();
}
