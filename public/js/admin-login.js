document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  var btn = document.getElementById('loginBtn');
  var err = document.getElementById('loginError');
  var original = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
  btn.disabled = true;
  err.style.display = 'none';

  var formData = new FormData(event.currentTarget);
  var credentials = Object.fromEntries(formData.entries());

  try {
    var response = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    var result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Login failed');
    window.location.assign('/admin');
  } catch (error) {
    err.textContent = error.message || 'Connection error. Please try again.';
    err.style.display = 'block';
    btn.innerHTML = original;
    btn.disabled = false;
  }
});
