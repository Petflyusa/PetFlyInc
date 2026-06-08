<?php
session_start();

if (!verifyHoneypot()) {
    echo json_encode(['success' => false, 'message' => 'Submission blocked.']);
    exit;
}

// Database configuration
$db_host = 'srv1294.hstgr.io';
$db_user = 'u727344629_petfly';
$db_pass = 'Jz10191019@@';
$db_name = 'u727344629_petfly';

// Email configuration
$admin_email = 'info@petflyusa.com';
$site_name = 'PetFly USA';

// Connect to database
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}

// Get form data
$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$phone = $_POST['phone'] ?? '';
$subject = $_POST['subject'] ?? '';
$message = $_POST['message'] ?? '';

// Validate required fields
if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
    exit;
}

// Sanitize input
$name = htmlspecialchars($name);
$email = htmlspecialchars($email);
$subject = htmlspecialchars($subject);
$message = htmlspecialchars($message);

// Insert into database
$stmt = $conn->prepare("INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $name, $email, $phone, $subject, $message);

if ($stmt->execute()) {
    // Prepare email content
    $email_subject = "Contact Form: $subject";
    $email_message = "
New Contact Form Submission

Name: $name
Email: $email
Phone: $phone
Subject: $subject

Message:
$message

---
This email was sent from $site_name website.
";
    
    // Send email notification
    mail($admin_email, $email_subject, $email_message);
    
    echo json_encode(['success' => true, 'message' => 'Message sent successfully!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error sending message']);
}

$stmt->close();
$conn->close();
?>