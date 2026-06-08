<?php
$db_host = 'srv1294.hstgr.io';
$db_user = 'u727344629_petfly';
$db_pass = 'Jz10191019@@';
$db_name = 'u727344629_petfly';

header('Content-Type: application/json');

$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

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