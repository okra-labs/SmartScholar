(async () => {
  const form = document.getElementById('resetForm');
  const message = document.getElementById('message');
  const token = new URLSearchParams(location.search).get('token') || '';
  let csrf = '';
  try {
    const response = await fetch('/api/bootstrap', { credentials: 'same-origin' });
    const data = await response.json();
    csrf = data.csrf || '';
  } catch {
    message.textContent = 'Could not connect. Refresh this page and try again.';
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    if (password !== confirm) { message.textContent = 'Passwords do not match.'; return; }
    if (!token) { message.textContent = 'This recovery link is missing or invalid. Request a new one.'; return; }
    message.textContent = 'Updating password…';
    try {
      const response = await fetch('/api/recovery/reset', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ token, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not reset password.');
      message.textContent = data.message;
      form.querySelector('button').disabled = true;
      history.replaceState(null, '', '/reset.html');
    } catch (error) { message.textContent = error.message; }
  });
})();
