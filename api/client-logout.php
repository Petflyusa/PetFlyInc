<?php
session_start();
session_destroy();
header('Location: client-login.php');
exit;
?>