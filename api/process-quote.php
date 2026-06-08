<?php
session_start();

if (!verifyHoneypot()) {
    echo json_encode(['success' => false, 'message' => 'Submission blocked.']);
    exit;
}

// Email configuration
$admin_email = 'info@petflyusa.com';
$site_name = 'PetFly USA';

// Connect to database
require_once __DIR__ . '/db.php';
$conn = new SupabaseDB();

if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]));
}

// Get form data
$pet_type = $_POST['petType'] ?? '';
$pet_name = $_POST['petName'] ?? '';
$pet_weight = $_POST['petWeight'] ?? '';
$breed = $_POST['breed'] ?? '';
$origin_country = $_POST['originCountry'] ?? '';
$origin_city = $_POST['originCity'] ?? '';
$dest_country = $_POST['destCountry'] ?? '';
$dest_city = $_POST['destCity'] ?? '';
$travel_date = $_POST['travelDate'] ?? '';
$transport_type = $_POST['transportType'] ?? '';
$contact_name = $_POST['contactName'] ?? '';
$email = $_POST['email'] ?? '';
$phone = $_POST['phone'] ?? '';
$referral = $_POST['referral'] ?? '';
$notes = $_POST['notes'] ?? '';

// Validate required fields
if (empty($pet_type) || empty($origin_city) || empty($dest_city) || empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
    exit;
}

// Insert into database
$stmt = $conn->prepare("INSERT INTO quote_requests 
    (pet_type, pet_name, pet_weight, breed, origin_country, origin_city, dest_country, dest_city, travel_date, transport_type, contact_name, email, phone, referral, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

$stmt->bind_param("sssssssssssssss", 
    $pet_type, $pet_name, $pet_weight, $breed, $origin_country, $origin_city, 
    $dest_country, $dest_city, $travel_date, $transport_type, $contact_name, 
    $email, $phone, $referral, $notes);

if ($stmt->execute()) {
    // Prepare email content
    $subject = "New Quote Request from $contact_name";
    $message = "
New Quote Request Received!

Client Information:
- Name: $contact_name
- Email: $email
- Phone: $phone
- Referred by: $referral

Pet Information:
- Type: $pet_type
- Name: $pet_name
- Weight: $pet_weight
- Breed: $breed

Transport Details:
- From: $origin_city, $origin_country
- To: $dest_city, $dest_country
- Travel Date: $travel_date
- Transport Type: $transport_type

Additional Notes:
$notes

---
This email was sent from $site_name website.
";
    
    // Send email notification
    mail($admin_email, $subject, $message);
    
    echo json_encode(['success' => true, 'message' => 'Quote request submitted successfully!']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error saving quote request']);
}

$stmt->close();
$conn->close();
?>