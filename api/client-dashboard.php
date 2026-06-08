<?php
session_start();
$pageTitle = 'Client Dashboard — PetFly USA';

if (!isset($_SESSION['client_id'])) {
    header('Location: client-login.php');
    exit;
}

require_once __DIR__ . '/db.php';
$conn = new SupabaseDB();
$client_id = $_SESSION['client_id'];
$client_name = $_SESSION['client_name'];

$tab = isset($_GET['tab']) ? $_GET['tab'] : 'dashboard';

$stages = ['consultation', 'documents', 'transfer_booking', 'pet_pickup', 'safe_transport', 'delivery'];
$stage_labels = [
    'consultation'    => 'Consultation',
    'documents'       => 'Documents',
    'transfer_booking'=> 'Transfer',
    'pet_pickup'      => 'Pickup',
    'safe_transport'  => 'Transport',
    'delivery'        => 'Delivery',
];

// ── Load all services for this client ──
$services = $conn->query("
    SELECT cs.*, cp.pet_name, cp.pet_type
    FROM client_services cs
    LEFT JOIN client_pets cp ON cs.pet_id = cp.id
    WHERE cs.client_id = $client_id
    ORDER BY cs.created_at DESC
");
$services_data = [];
while ($s = $services->fetch_assoc()) $services_data[] = $s;

// ── Load all SOP rows for all these services ──
$svc_ids = array_column($services_data, 'id');
$sop_by_service = [];
if (count($svc_ids) > 0) {
    $in = implode(',', array_map('intval', $svc_ids));
    $sop_res = $conn->query("SELECT * FROM service_sop WHERE service_id IN ($in) ORDER BY id ASC");
    while ($row = $sop_res->fetch_assoc()) {
        $sop_by_service[$row['service_id']][] = $row;
    }
}

// ── Load all pets ──
$pets = $conn->query("SELECT * FROM client_pets WHERE client_id = $client_id");
$pets_data = [];
while ($p = $pets->fetch_assoc()) $pets_data[] = $p;

// ── Load client messages ──
$msgs_data = [];
$msgs_q = $conn->query("SELECT * FROM client_messages WHERE client_id = $client_id ORDER BY created_at DESC LIMIT 50");
while ($m = $msgs_q->fetch_assoc()) $msgs_data[] = $m;

$conn->close();

// Embed messages as JSON for JS
$msgs_json = json_encode($msgs_data);

/**
 * Compute the live current stage from service_sop rows:
 * Priority: in_progress > furthest completed > first stage
 */
function getLiveStage($sop_rows, $stages) {
    if (!$sop_rows || count($sop_rows) == 0) return $stages[0];
    $furthest_done = null;
    $active_stage  = null;
    foreach ($sop_rows as $r) {
        if ($r['status'] === 'completed')   $furthest_done = $r['stage'];
        if ($r['status'] === 'in_progress')  $active_stage  = $r['stage'];
    }
    if ($active_stage !== null) return $active_stage;
    return $furthest_done ?: $stages[0];
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
      --cream: #F7F5F0; --warm-white: #FDFCFA; --warm-gray-100: #E8E4DE;
      --warm-gray-200: #D4CFC7; --warm-gray-500: #9A928A; --charcoal: #2A2723;
      --font-serif: 'Playfair Display', Georgia, serif;
      --font-sans: 'DM Sans', -apple-system, sans-serif;
      --space-sm: 0.75rem; --space-md: 1rem; --space-lg: 1.5rem;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-sans); background: var(--cream); color: var(--charcoal); font-size: 15px; }

    /* Layout */
    .db-wrap { display: flex; min-height: 100dvh; }

    /* Sidebar */
    .sidebar {
      width: 240px; background: var(--charcoal);
      display: flex; flex-direction: column;
      padding: var(--space-lg) var(--space-md);
      position: fixed; top: 0; left: 0; height: 100dvh; z-index: 10;
    }
    .sidebar-logo { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: var(--cream); margin-bottom: var(--space-lg); }
    .sidebar-logo__icon { width: 36px; height: 36px; border: 1px solid rgba(247,245,240,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--cream); }
    .sidebar-logo__text { font-family: var(--font-serif); font-size: 0.9375rem; color: var(--cream); }
    .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
    .sidebar-nav a { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.875rem; font-size: 0.8125rem; color: rgba(247,245,240,0.55); text-decoration: none; letter-spacing: 0.04em; transition: color 0.2s, background 0.2s; border-radius: 6px; position: relative; }
    .sidebar-nav a i { font-size: 0.75rem; width: 16px; text-align: center; }
    .sidebar-nav a:hover { color: var(--cream); background: rgba(247,245,240,0.06); }
    .sidebar-nav a.active { color: var(--cream); background: rgba(247,245,240,0.12); }
    .sidebar-nav a.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 60%; background: rgba(247,245,240,0.5); border-radius: 0 2px 2px 0; }
    .sidebar-user { padding-top: var(--space-md); border-top: 1px solid rgba(247,245,240,0.1); }
    .sidebar-user__name { font-size: 0.8125rem; color: var(--cream); margin-bottom: 0.875rem; line-height: 1.4; }
    .sidebar-user a { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: rgba(247,245,240,0.4); text-decoration: none; letter-spacing: 0.06em; text-transform: uppercase; transition: color 0.2s; }
    .sidebar-user a:hover { color: var(--cream); }

    /* Main */
    .db-main { flex: 1; margin-left: 240px; background: var(--cream); min-height: 100dvh; display: flex; flex-direction: column; }

    /* Header */
    .db-header { padding: var(--space-lg) var(--space-lg) 0; display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: var(--space-lg); }
    .db-header__label { font-size: 0.625rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--warm-gray-500); margin-bottom: 0.5rem; }
    .db-header__title { font-family: var(--font-serif); font-size: clamp(1.5rem, 2.5vw, 2rem); font-weight: 400; color: var(--charcoal); letter-spacing: -0.025em; line-height: 1.2; }
    .db-header__title em { font-style: normal; color: var(--warm-gray-500); font-weight: 300; }
    .db-header__meta { font-size: 0.8125rem; color: var(--warm-gray-500); }

    /* Tab pages */
    .tab-page { display: none; padding: 0 var(--space-lg) var(--space-lg); flex: 1; }
    .tab-page.active { display: block; }

    /* Service card */
    .svc-card { background: var(--warm-white); border: 1px solid var(--warm-gray-100); padding: var(--space-lg); margin-bottom: var(--space-md); }
    .svc-card__top { display: grid; grid-template-columns: 1fr auto; gap: var(--space-md); align-items: start; margin-bottom: var(--space-lg); padding-bottom: var(--space-md); border-bottom: 1px solid var(--warm-gray-100); }
    .svc-pet { display: flex; flex-direction: column; gap: 0.25rem; }
    .svc-pet__name { font-family: var(--font-serif); font-size: 1.25rem; color: var(--charcoal); letter-spacing: -0.015em; display: flex; align-items: center; gap: 0.75rem; }
    .svc-pet__name i { font-size: 0.8rem; color: var(--warm-gray-500); }
    .svc-pet__meta { font-size: 0.8125rem; color: var(--warm-gray-500); display: flex; align-items: center; gap: 1rem; }
    .svc-pet__meta span { display: flex; align-items: center; gap: 0.375rem; }
    .svc-route { text-align: right; font-size: 0.8125rem; color: var(--warm-gray-500); padding: 0.75rem 1rem; border: 1px solid var(--warm-gray-100); white-space: nowrap; }
    .svc-route strong { display: block; font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--charcoal); margin-bottom: 0.25rem; }

    /* Progress */
    .svc-track { margin-bottom: var(--space-md); }
    .svc-track__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .svc-track__pct { font-family: var(--font-serif); font-size: 1.5rem; color: var(--charcoal); letter-spacing: -0.025em; }
    .svc-track__stage { font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray-500); display: flex; align-items: center; gap: 0.5rem; }
    .svc-track__stage::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--warm-gray-500); }
    .svc-track__bar { height: 1px; background: var(--warm-gray-100); position: relative; margin-bottom: 1.5rem; }
    .svc-track__bar-fill { position: absolute; left: 0; top: 0; height: 100%; background: var(--charcoal); transition: width 0.6s cubic-bezier(0.25,0.1,0.25,1); }
    .svc-steps { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0; }
    .svc-step { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0 0.25rem; }
    .svc-step::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--warm-gray-200); margin-bottom: 0.375rem; transition: background 0.3s; }
    .svc-step.done::before { background: var(--charcoal); }
    .svc-step.active::before { background: var(--charcoal); box-shadow: 0 0 0 3px rgba(42,39,35,0.12); }
    .svc-step__label { font-size: 0.625rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--warm-gray-500); text-align: center; }
    .svc-step.done .svc-step__label, .svc-step.active .svc-step__label { color: var(--charcoal); }
    .svc-step.active .svc-step__label { font-weight: 500; }

    /* SOP detail */
    .svc-sop-list { margin-top: var(--space-md); }
    .svc-sop-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; border-bottom: 1px solid var(--warm-gray-100); font-size: 0.8125rem; }
    .svc-sop-item:last-child { border-bottom: none; }
    .sop-icon { width: 20px; text-align: center; color: var(--warm-gray-200); font-size: 0.75rem; flex-shrink: 0; }
    .sop-icon.done   { color: #00695c; }
    .sop-icon.active { color: #f57f17; }
    .sop-label { flex: 1; color: var(--charcoal); }
    .sop-status { font-size: 0.6875rem; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; }
    .sop-status.pending    { background: var(--warm-gray-100); color: var(--warm-gray-500); }
    .sop-status.in_progress{ background: #fff8e1; color: #f57f17; }
    .sop-status.completed  { background: #e0f2f1; color: #00695c; }

    /* Details grid */
    .svc-details { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-sm); margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--warm-gray-100); }
    .svc-detail__label { font-size: 0.5625rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--warm-gray-500); margin-bottom: 0.375rem; }
    .svc-detail__value { font-size: 0.875rem; color: var(--charcoal); }

    /* Pets grid */
    .pets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-md); padding-bottom: var(--space-lg); }
    .pet-card { background: var(--warm-white); border: 1px solid var(--warm-gray-100); padding: var(--space-lg); position: relative; }
    .pet-card__photo { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--warm-gray-100); position: absolute; top: var(--space-lg); right: var(--space-lg); }
    .pet-card__name { font-family: var(--font-serif); font-size: 1.125rem; color: var(--charcoal); margin-bottom: 0.5rem; padding-right: 80px; display: flex; align-items: center; gap: 0.5rem; }
    .pet-card__meta { font-size: 0.8125rem; color: var(--warm-gray-500); display: flex; flex-direction: column; gap: 0.375rem; }
    .pet-card__meta span { display: flex; align-items: center; gap: 0.5rem; }

    /* Empty */
    .db-empty { padding: var(--space-xl) var(--space-lg); text-align: center; }
    .db-empty__icon { font-size: 2.5rem; color: var(--warm-gray-200); margin-bottom: 1rem; }
    .db-empty h3 { font-family: var(--font-serif); font-size: 1.25rem; font-weight: 400; color: var(--charcoal); margin-bottom: 0.5rem; }
    .db-empty p { font-size: 0.9rem; color: var(--warm-gray-500); }
    .db-empty a { color: var(--charcoal); }

    /* Section label */
    .section-label { font-size: 0.5625rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--warm-gray-500); margin-bottom: 0.5rem; display: block; }

    @media (max-width: 900px) {
      .sidebar { width: 200px; } .db-main { margin-left: 200px; }
      .svc-details { grid-template-columns: repeat(2, 1fr); }
      .svc-steps { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 640px) {
      .sidebar { width: 100%; height: auto; position: static; flex-direction: row; padding: 1rem; align-items: center; }
      .sidebar-logo { margin-bottom: 0; } .sidebar-nav { display: none; }
      .db-main { margin-left: 0; }
      .db-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
      .svc-card__top { grid-template-columns: 1fr; } .svc-route { text-align: left; }
      .svc-details { grid-template-columns: repeat(2, 1fr); }
      .svc-steps { grid-template-columns: repeat(3, 1fr); }
    }
  </style>
</head>
<body>

<div class="db-wrap">

  <!-- Sidebar -->
  <aside class="sidebar">
    <a href="client-dashboard.php" class="sidebar-logo">
      <div class="sidebar-logo__icon"><i class="fas fa-paw"></i></div>
      <span class="sidebar-logo__text">PetFly USA</span>
    </a>
    <nav class="sidebar-nav">
      <a href="client-dashboard.php?tab=dashboard"  class="<?php if($tab==='dashboard') echo 'active'; ?>"><i class="fas fa-columns"></i> Dashboard</a>
      <a href="client-dashboard.php?tab=pets"       class="<?php if($tab==='pets')    echo 'active'; ?>"><i class="fas fa-paw"></i> My Pets</a>
      <a href="client-dashboard.php?tab=documents"  class="<?php if($tab==='documents')echo 'active'; ?>"><i class="fas fa-file-alt"></i> Documents</a>
      <a href="client-dashboard.php?tab=messages"   class="<?php if($tab==='messages') echo 'active'; ?>"><i class="fas fa-comments"></i> Messages</a>
      <a href="client-dashboard.php?tab=settings"    class="<?php if($tab==='settings')  echo 'active'; ?>"><i class="fas fa-cog"></i> Settings</a>
    </nav>
    <div class="sidebar-user">
      <div class="sidebar-user__name"><?php echo htmlspecialchars($client_name); ?></div>
      <a href="client-logout.php"><i class="fas fa-sign-out-alt" style="font-size:0.7rem;"></i> Sign Out</a>
    </div>
  </aside>

  <!-- Main -->
  <main class="db-main">

    <header class="db-header">
      <div class="db-header__left">
        <p class="db-header__label">Client Portal</p>
        <h1 class="db-header__title">
          <?php if ($tab === 'dashboard'):   echo 'Good to see you, <em>'.htmlspecialchars(explode(' ', $client_name)[0]).'</em>.'; ?>
          <?php elseif ($tab === 'pets'):    echo 'My <em>Pets</em>.'; ?>
          <?php elseif ($tab === 'documents'):echo 'My <em>Documents</em>.'; ?>
          <?php elseif ($tab === 'messages'):echo 'My <em>Messages</em>.'; ?>
          <?php elseif ($tab === 'settings'):echo '<em>Settings</em>.'; ?>
          <?php else: echo 'Dashboard'; endif; ?>
        </h1>
      </div>
      <div class="db-header__meta"><?php echo date('F j, Y'); ?></div>
    </header>

    <!-- ═══ DASHBOARD ═══ -->
    <div class="tab-page <?php if($tab==='dashboard') echo 'active'; ?>">

      <?php if (count($services_data) > 0): ?>
      <div class="db-services">
        <?php foreach ($services_data as $svc):
          $svc_id = intval($svc['id']);
          $sop_rows = $sop_by_service[$svc_id] ?? [];
          $actual_stage = getLiveStage($sop_rows, $stages);
          $current_idx = array_search($actual_stage, $stages);
          $current_idx = $current_idx === false ? 0 : $current_idx;
          $total = count($stages);
          $pct = $total > 1 ? round(($current_idx / ($total - 1)) * 100) : 0;
          $stage_label = $stage_labels[$actual_stage] ?? ucwords(str_replace('_', ' ', $actual_stage));
        ?>
        <article class="svc-card">
          <div class="svc-card__top">
            <div class="svc-pet">
              <div class="svc-pet__name">
                <i class="fas fa-paw"></i>
                <?php echo htmlspecialchars($svc['pet_name'] ?: 'Pet Transport'); ?>
              </div>
              <div class="svc-pet__meta">
                <span><?php echo htmlspecialchars($svc['pet_type'] ?: 'Pet'); ?></span>
                <span><i class="fas fa-arrow-right" style="font-size:0.6rem;"></i></span>
                <span><?php echo htmlspecialchars($svc['origin_city']); ?></span>
                <span>→</span>
                <span><?php echo htmlspecialchars($svc['dest_city']); ?></span>
              </div>
            </div>
            <div class="svc-route">
              <strong>Route</strong>
              <?php echo htmlspecialchars($svc['origin_country']); ?>
              <i class="fas fa-arrow-right" style="font-size:0.6rem; margin: 0 0.25rem;"></i>
              <?php echo htmlspecialchars($svc['dest_country']); ?>
            </div>
          </div>

          <!-- Progress Track -->
          <div class="svc-track">
            <div class="svc-track__header">
              <span class="svc-track__pct"><?php echo $pct; ?>%</span>
              <span class="svc-track__stage"><?php echo htmlspecialchars($stage_label); ?></span>
            </div>
            <div class="svc-track__bar">
              <div class="svc-track__bar-fill" style="width:<?php echo $pct; ?>%;"></div>
            </div>
            <div class="svc-steps">
              <?php foreach ($stages as $idx => $stage):
                $step_class = $idx < $current_idx ? 'done' : ($idx === $current_idx ? 'active' : '');
              ?>
                <div class="svc-step <?php echo $step_class; ?>">
                  <span class="svc-step__label"><?php echo $stage_labels[$stage]; ?></span>
                </div>
              <?php endforeach; ?>
            </div>
          </div>

          <!-- SOP Detail per stage -->
          <?php if (count($sop_rows) > 0): ?>
          <div class="svc-sop-list">
            <span class="section-label">Progress Details</span>
            <?php foreach ($sop_rows as $sop):
              $icon_class = $sop['status'] === 'completed' ? 'fa-check-circle done' : ($sop['status'] === 'in_progress' ? 'fa-spinner fa-pulse active' : 'fa-circle');
              $sop_label = $stage_labels[$sop['stage']] ?? ucwords(str_replace('_', ' ', $sop['stage']));
              $status_text = $sop['status'] === 'in_progress' ? 'In Progress' : ucfirst($sop['status']);
            ?>
              <div class="svc-sop-item">
                <i class="fas <?php echo $icon_class; ?> sop-icon <?php echo $sop['status']; ?>"></i>
                <span class="sop-label"><?php echo htmlspecialchars($sop_label); ?></span>
                <span class="sop-status <?php echo $sop['status']; ?>"><?php echo $status_text; ?></span>
              </div>
            <?php endforeach; ?>
          </div>
          <?php endif; ?>

          <!-- Details grid -->
          <div class="svc-details">
            <?php foreach ($pets_data as $p): if (intval($p['id']) === intval($svc['pet_id'])): ?>
            <div class="svc-detail"><div class="svc-detail__label">Pet Type</div><div class="svc-detail__value"><?php echo htmlspecialchars($p['pet_type']); ?></div></div>
            <div class="svc-detail"><div class="svc-detail__label">Breed</div><div class="svc-detail__value"><?php echo htmlspecialchars($p['breed']) ?: '—'; ?></div></div>
            <div class="svc-detail"><div class="svc-detail__label">Weight</div><div class="svc-detail__value"><?php echo htmlspecialchars($p['weight']) ?: '—'; ?></div></div>
            <div class="svc-detail"><div class="svc-detail__label">Microchip</div><div class="svc-detail__value"><?php echo htmlspecialchars($p['microchip']) ?: '—'; ?></div></div>
            <?php break; endif; endforeach; ?>
            <?php if (!empty($svc['travel_date'])): ?>
            <div class="svc-detail"><div class="svc-detail__label">Travel Date</div><div class="svc-detail__value"><?php echo date('M j, Y', strtotime($svc['travel_date'])); ?></div></div>
            <?php endif; ?>
            <div class="svc-detail"><div class="svc-detail__label">Transport</div><div class="svc-detail__value"><?php echo ucfirst(str_replace('-', ' ', $svc['transport_type'])); ?></div></div>
            <div class="svc-detail"><div class="svc-detail__label">Overall Status</div><div class="svc-detail__value"><?php echo htmlspecialchars(ucfirst($svc['current_status'])); ?></div></div>
          </div>
        </article>
        <?php endforeach; ?>
      </div>
      <?php else: ?>
      <div class="db-empty">
        <div class="db-empty__icon"><i class="fas fa-paw"></i></div>
        <h3>No active transports.</h3>
        <p>Ready to travel with your pet? <a href="quote.php">Request a quote.</a></p>
      </div>
      <?php endif; ?>
    </div>

    <!-- ═══ PETS ═══ -->
    <div class="tab-page <?php if($tab==='pets') echo 'active'; ?>">
      <?php if (count($pets_data) > 0): ?>
      <div class="pets-grid">
        <?php foreach ($pets_data as $p): ?>
        <div class="pet-card">
          <?php if (!empty($p['photo_url'])): ?>
          <img src="<?php echo htmlspecialchars($p['photo_url']); ?>" alt="<?php echo htmlspecialchars($p['pet_name']); ?>" class="pet-card__photo">
          <?php endif; ?>
          <div class="pet-card__name"><i class="fas fa-paw" style="font-size:0.8rem;color:var(--warm-gray-500);"></i> <?php echo htmlspecialchars($p['pet_name']); ?></div>
          <div class="pet-card__meta">
            <span><strong>Type:</strong> <?php echo htmlspecialchars($p['pet_type']); ?></span>
            <span><strong>Breed:</strong> <?php echo htmlspecialchars($p['breed']) ?: '—'; ?></span>
            <span><strong>Weight:</strong> <?php echo htmlspecialchars($p['weight']) ? $p['weight'].' kg' : '—'; ?></span>
            <span><strong>Microchip:</strong> <?php echo htmlspecialchars($p['microchip']) ?: '—'; ?></span>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
      <?php else: ?>
      <div class="db-empty">
        <div class="db-empty__icon"><i class="fas fa-paw"></i></div>
        <h3>No pets registered.</h3>
        <p>Contact us to add a pet to your account.</p>
      </div>
      <?php endif; ?>
    </div>

    <!-- ═══ DOCUMENTS ═══ -->
    <div class="tab-page <?php if($tab==='documents') echo 'active'; ?>">
      <div class="db-empty">
        <div class="db-empty__icon"><i class="fas fa-file-alt"></i></div>
        <h3>Documents</h3>
        <p>Your travel documents will appear here once processed by our team.</p>
      </div>
    </div>

    <!-- ═══ MESSAGES ═══ -->
    <div class="tab-page <?php if($tab==='messages') echo 'active'; ?>">
      <?php if (count($msgs_data) > 0): ?>
      <div style="max-width:720px;padding-bottom:2rem">
        <?php foreach ($msgs_data as $m):
          $is_admin = ($m['sender'] === 'admin');
          $msg_date = date('M j, Y · g:i a', strtotime($m['created_at']));
        ?>
        <div style="background:var(--warm-white);border:1px solid var(--warm-gray-100);border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1rem;<?php if($is_admin): ?>border-left:3px solid var(--charcoal);<?php endif; ?>">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
            <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--warm-gray-500);font-weight:600">
              <?php if($is_admin): ?><i class="fas fa-building" style="font-size:0.7rem;margin-right:4px"></i>PetFly USA Team<?php else: ?>You<?php endif; ?>
            </span>
            <span style="font-size:0.75rem;color:var(--warm-gray-500)"><?php echo $msg_date; ?></span>
          </div>
          <?php if (!empty($m['subject'])): ?>
          <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--warm-gray-500);margin-bottom:0.375rem"><?php echo htmlspecialchars($m['subject']); ?></div>
          <?php endif; ?>
          <div style="font-size:0.9375rem;color:var(--charcoal);line-height:1.6;white-space:pre-wrap"><?php echo htmlspecialchars($m['message']); ?></div>
        </div>
        <?php endforeach; ?>
      </div>
      <?php else: ?>
      <div class="db-empty">
        <div class="db-empty__icon"><i class="fas fa-comments"></i></div>
        <h3>No messages yet.</h3>
        <p>Messages from our team will appear here.</p>
      </div>
      <?php endif; ?>
    </div>

    <!-- ═══ SETTINGS ═══ -->
    <div class="tab-page <?php if($tab==='settings') echo 'active'; ?>">
      <div class="db-empty">
        <div class="db-empty__icon"><i class="fas fa-cog"></i></div>
        <h3>Account Settings</h3>
        <p>Update your profile, password, and notification preferences.</p>
      </div>
    </div>

  </main>
</div>

</body>
</html>
