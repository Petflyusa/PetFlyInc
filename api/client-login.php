<?php
session_start();
$pageTitle = 'Client Login — PetFly USA';

if (isset($_SESSION['client_id'])) {
    header('Location: client-dashboard.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once __DIR__ . '/db.php';
    $conn = new SupabaseDB();
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    $stmt = $conn->prepare("SELECT id, full_name FROM clients WHERE username = ? AND password = ?");
    $stmt->bind_param("ss", $username, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $_SESSION['client_id'] = $row['id'];
        $_SESSION['client_name'] = $row['full_name'];
        header('Location: client-dashboard.php');
        exit;
    } else {
        $error = 'Invalid username or password';
    }

    $conn->close();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo $pageTitle; ?></title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --cream: #F7F5F0;
      --warm-white: #FDFCFA;
      --warm-gray-100: #EDEAE4;
      --warm-gray-200: #D9D5CC;
      --warm-gray-500: #8A857A;
      --charcoal: #2A2723;
      --charcoal-deep: #1A1816;
      --font-serif: 'Playfair Display', Georgia, serif;
      --font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --space-xs: 0.5rem;
      --space-sm: 1rem;
      --space-md: 2rem;
      --space-lg: 3rem;
      --space-xl: 4rem;
    }
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { font-size: 16px; -webkit-font-smoothing: antialiased; }
    body {
      font-family: var(--font-sans);
      background: var(--charcoal-deep);
      color: var(--charcoal);
      min-height: 100dvh;
      display: flex;
    }

    /* ── Left: Brand Hero ── */
    .hero-panel {
      flex: 1.1;
      background: var(--charcoal-deep);
      background-image:
        radial-gradient(ellipse at 25% 75%, rgba(155,139,122,0.15) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 10%, rgba(155,139,122,0.08) 0%, transparent 45%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: var(--space-xl) var(--space-lg);
      position: relative;
      overflow: hidden;
    }

    .hero-panel::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url('https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1400&q=80');
      background-size: cover;
      background-position: center 40%;
      opacity: 0.15;
    }

    .hero-panel::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to top,
        rgba(26,24,22,0.65) 0%,
        rgba(26,24,22,0.2) 40%,
        rgba(26,24,22,0.1) 100%
      );
    }

    .hero-panel__content {
      position: relative;
      z-index: 2;
    }

    .hero-logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      margin-bottom: auto;
      padding-bottom: var(--space-lg);
    }

    .hero-logo__icon {
      width: 38px;
      height: 38px;
      border: 1px solid rgba(247,245,240,0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      color: var(--cream);
    }

    .hero-logo__text {
      font-family: var(--font-serif);
      font-size: 1rem;
      color: var(--cream);
      letter-spacing: -0.01em;
    }

    .hero-panel blockquote {
      font-family: var(--font-serif);
      font-size: clamp(1.375rem, 2.5vw, 2.125rem);
      font-weight: 400;
      line-height: 1.35;
      color: var(--cream);
      max-width: 18ch;
      letter-spacing: -0.02em;
      margin-bottom: 1.25rem;
    }

    .hero-panel cite {
      display: block;
      font-style: normal;
      font-size: 0.75rem;
      color: rgba(247,245,240,0.4);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    /* ── Right: Form Panel ── */
    .form-panel {
      width: 480px;
      min-height: 100dvh;
      background: var(--warm-white);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: var(--space-xl) var(--space-lg);
    }

    .form-panel__inner {
      max-width: 340px;
    }

    .form-header {
      margin-bottom: 2.5rem;
    }

    .form-header h2 {
      font-family: var(--font-serif);
      font-size: 1.625rem;
      font-weight: 400;
      color: var(--charcoal);
      letter-spacing: -0.025em;
      margin-bottom: 0.5rem;
    }

    .form-header p {
      font-size: 0.9rem;
      color: var(--warm-gray-500);
      line-height: 1.65;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.625rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--warm-gray-500);
      margin-bottom: 0.4rem;
    }

    .input-wrap {
      position: relative;
    }

    .input-wrap i {
      position: absolute;
      left: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--warm-gray-500);
      font-size: 0.875rem;
      pointer-events: none;
      transition: color 0.2s;
    }

    .input-field {
      width: 100%;
      padding: 0.8125rem 0.875rem 0.8125rem 2.625rem;
      border: 1px solid var(--warm-gray-200);
      background: var(--warm-white);
      font-family: var(--font-sans);
      font-size: 0.9375rem;
      color: var(--charcoal);
      transition: border-color 0.2s;
      border-radius: 0;
      -webkit-appearance: none;
      appearance: none;
    }

    .input-field:focus {
      outline: none;
      border-color: var(--charcoal);
    }

    .input-field:focus ~ i,
    .input-field:focus + i {
      color: var(--charcoal);
    }

    .input-field::placeholder {
      color: var(--warm-gray-200);
    }

    .error-msg {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.875rem 1rem;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #991B1B;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .btn-login {
      width: 100%;
      padding: 0.9375rem 1rem;
      background: var(--charcoal);
      color: var(--cream);
      border: 1px solid var(--charcoal);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.22s cubic-bezier(0.25, 0.1, 0.25, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      margin-top: 0.25rem;
    }

    .btn-login:hover {
      background: #1A1816;
      border-color: #1A1816;
    }

    .btn-login:active {
      transform: translateY(1px);
    }

    .back-row {
      margin-top: 2rem;
      padding-top: 1.75rem;
      border-top: 1px solid var(--warm-gray-100);
    }

    .back-row a {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--warm-gray-500);
      text-decoration: none;
      letter-spacing: 0.04em;
      transition: color 0.2s;
    }

    .back-row a:hover {
      color: var(--charcoal);
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      body { flex-direction: column; }
      .hero-panel {
        min-height: 45dvh;
        padding: 2rem;
        flex: none;
      }
      .hero-panel blockquote { font-size: 1.25rem; max-width: 100%; }
      .hero-logo { margin-bottom: 0; }
      .hero-logo__icon { width: 32px; height: 32px; }
      .form-panel {
        width: 100%;
        min-height: auto;
        padding: 2.5rem 1.75rem;
        justify-content: flex-start;
      }
      .form-panel__inner { max-width: 100%; }
    }
  </style>
</head>
<body>

  <!-- Left: Brand / Hero -->
  <div class="hero-panel">
    <a href="index.php" class="hero-logo">
      <div class="hero-logo__icon"><i class="fas fa-plane"></i></div>
      <span class="hero-logo__text">PetFly USA</span>
    </a>
    <div class="hero-panel__content">
      <blockquote>
        "Caring for your companions, wherever in the world they need to go."
      </blockquote>
      <cite>Client Portal</cite>
    </div>
  </div>

  <!-- Right: Login Form -->
  <div class="form-panel">
    <div class="form-panel__inner">

      <div class="form-header">
        <h2>Welcome back.</h2>
        <p>Sign in to manage your pet transport progress.</p>
      </div>

      <?php if ($error): ?>
      <div class="error-msg">
        <i class="fas fa-exclamation-circle"></i>
        <?php echo htmlspecialchars($error); ?>
      </div>
      <?php endif; ?>

      <form method="POST" novalidate>
        <div class="form-group">
          <label for="username">Username</label>
          <div class="input-wrap">
            <input type="text" id="username" name="username" class="input-field" placeholder="Your username" required autofocus autocomplete="username">
            <i class="fas fa-user"></i>
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-wrap">
            <input type="password" id="password" name="password" class="input-field" placeholder="Your password" required autocomplete="current-password">
            <i class="fas fa-lock"></i>
          </div>
        </div>

        <button type="submit" class="btn-login">
          Sign In <i class="fas fa-arrow-right" style="font-size:0.7rem;"></i>
        </button>
      </form>

      <div class="back-row">
        <a href="index.php">
          <i class="fas fa-arrow-left" style="font-size:0.65rem;"></i>
          Back to PetFly USA
        </a>
      </div>

    </div>
  </div>

</body>
</html>