# PetFly USA Website - Deployment Package

## 📦 Package Contents

```
├── header.php          # Site header (navigation)
├── footer.php          # Site footer
├── index.php           # Homepage
├── service.php         # Services page
├── quote.php           # Quote request page
├── contact.php         # Contact page
├── Regulations.php     # Import/export regulations
├── admin.php           # Admin panel
├── client-login.php    # Client login
├── client-dashboard.php # Client dashboard
├── process-quote.php   # Quote form processor
├── process-contact.php # Contact form processor
├── get_regulation.php  # Regulations API
├── captcha.php         # CAPTCHA generator
├── client-logout.php   # Logout handler
├── style-v2.css        # Main stylesheet (v2, CDN-busted)
└── style.css           # Legacy stylesheet
```

## 🖥️ Server Requirements

- PHP 7.4+ (with GD extension for CAPTCHA)
- MySQL 5.7+ or MariaDB 10.3+
- Apache/Nginx with mod_rewrite enabled

## 🚀 Deployment Steps

### 1. Upload Files
Upload all files to your web server's document root (e.g., `/var/www/html/` or `/home/user/public_html/`)

### 2. Database Setup
Create a MySQL database and import the schema:

```sql
CREATE DATABASE petflyusa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Update database connection in relevant PHP files (admin.php, client-dashboard.php, etc.)

### 3. Configuration
Edit the following files to update database credentials:

- `admin.php` - search for `$conn = new mysqli(...)` section
- `client-dashboard.php`
- `client-login.php`
- `process-contact.php`
- `process-quote.php`

Default credentials (update these):
- Host: localhost
- Database: u727344629_petflyusa
- User: your_db_user
- Password: your_db_password

### 4. Permissions
```bash
chmod 644 *.php *.css
chmod 755 . # web root
```

### 5. Web Server Config

**Apache (.htaccess)** - if using Apache:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([^\.]+)$ $1.php [NC,L]
```

**Nginx** - add to server block:
```nginx
location / {
    try_files $uri $uri/ $uri.php?$query_string;
}
```

## 🔑 Admin Access
- URL: `/admin.php`
- Default password: `admin123` (change this!)

## 🎨 Design Info
- **Style**: Magazine editorial, asymmetric, restrained
- **Palette**: Cream (#F7F5F0), Warm-white (#FDFCFA), Warm-gray, Charcoal (#2A2723)
- **Fonts**: Playfair Display (headings) + DM Sans (body)
- **Latest CSS**: style-v2.css (already linked in PHP files)

## 📁 Original Hostinger Server
- SSH: ssh -p 65002 u727344629@89.116.192.166
- Path: /home/u727344629/domains/petflyusa.com/public_html/