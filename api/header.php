<?php
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="PetFly USA - Your trusted partner for international pet transportation. IATA & USDA certified, 8+ years experience, serving 15+ countries.">
  <title><?php echo isset($pageTitle) ? $pageTitle : 'PetFly USA'; ?></title>
  <link rel="stylesheet" href="css/style-v5.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
</head>
<body>

  <!-- Header -->
  <header id="siteHeader">
    <div class="container">
      <a href="index.php" class="logo">
        <div class="logo-icon"><i class="fas fa-plane"></i></div>
        PetFly USA
      </a>
      <nav>
        <ul>
          <li><a href="index.php" <?php echo $currentPage == 'index.php' ? 'class="active"' : ''; ?>>Home</a></li>
          <li><a href="service.php" <?php echo $currentPage == 'service.php' ? 'class="active"' : ''; ?>>Services</a></li>
          <li><a href="quote.php" <?php echo $currentPage == 'quote.php' ? 'class="active"' : ''; ?>>Quote</a></li>
          <li><a href="Regulations.php" <?php echo $currentPage == 'Regulations.php' ? 'class="active"' : ''; ?>>Regulations</a></li>
          <li><a href="contact.php" <?php echo $currentPage == 'contact.php' ? 'class="active"' : ''; ?>>Contact</a></li>
        </ul>
      </nav>
      <div class="menu-toggle" onclick="document.querySelector('.mobile-nav').classList.toggle('active'); this.classList.toggle('active');">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </header>

  <!-- Mobile Nav -->
  <div class="mobile-nav">
    <a href="index.php">Home</a>
    <a href="service.php">Services</a>
    <a href="quote.php">Quote</a>
    <a href="Regulations.php">Regulations</a>
    <a href="contact.php">Contact</a>
  </div>