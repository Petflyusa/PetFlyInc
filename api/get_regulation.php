<?php
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');
$conn = new SupabaseDB();

if (isset($_GET['id'])) {
    $id = intval($_GET['id']);
    $result = $conn->query("SELECT * FROM country_regulations WHERE id = $id");
    echo json_encode($result->fetch_assoc());
} elseif (isset($_GET['airline'])) {
    $id = intval($_GET['airline']);
    $result = $conn->query("SELECT * FROM airline_regulations WHERE id = $id");
    echo json_encode($result->fetch_assoc());
}

$conn->close();
?>