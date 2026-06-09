<?php
/* =====================================================
   PetFly USA Admin Panel
   ===================================================== */

require_once __DIR__ . '/db.php';
$admin_password = 'admin123';

session_start();

if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

$login_error = false;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_password'])) {
    if ($_POST['login_password'] === $admin_password) {
        $_SESSION['admin_logged_in'] = true;
    } else {
        $login_error = true;
    }
}

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    echo '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PetFly USA Admin</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,#1E3A5F,#2c4a6e);min-height:100vh;display:flex;justify-content:center;align-items:center}
.box{background:white;padding:48px;border-radius:20px;width:400px;text-align:center;box-shadow:0 25px 70px rgba(0,0,0,.35)}
.logo{font-size:36px;margin-bottom:8px;color:#1E3A5F}
h1{color:#1E3A5F;margin-bottom:30px;font-size:22px}
input,button{width:100%;padding:14px;margin:8px 0;border:2px solid #e0e0e0;border-radius:10px;box-sizing:border-box;font-size:15px}
input:focus{border-color:#1E3A5F;outline:none}
button{background:#1E3A5F;color:white;border:none;cursor:pointer;font-weight:600;transition:background .2s}
button:hover{background:#2c4a6e}
.err{color:#e74c3c;margin-top:10px;font-size:14px}
</style>
</head>
<body>
<div class="box">
  <div class="logo"><i class="fas fa-paw"></i></div>
  <h1>PetFly USA Admin</h1>
  <form method="POST">
    <input type="password" name="login_password" placeholder="Enter password" required autofocus>
    <button type="submit">Sign In</button>
  </form>';
    if ($login_error) echo '<p class="err">Invalid password</p>';
    echo '</div>
</body>
</html>';
    exit;
}

$conn = new SupabaseDB();

/* =====================================================
   API HANDLERS
   ===================================================== */
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    $id = intval($_GET['id'] ?? $_POST['id'] ?? 0);

    switch ($_GET['action']) {

        case 'get_quote':
            echo json_encode($conn->query("SELECT * FROM quote_requests WHERE id=$id")->fetch_assoc());
            break;

        case 'update_quote':
            $s = $conn->prepare("UPDATE quote_requests SET pet_type=?,pet_name=?,breed=?,origin_country=?,origin_city=?,dest_country=?,dest_city=?,travel_date=?,transport_type=?,contact_name=?,email=?,phone=?,notes=?,status=? WHERE id=?");
            $s->bind_param("sssssssssssssi", $_POST['pet_type'],$_POST['pet_name'],$_POST['breed'],$_POST['origin_country'],$_POST['origin_city'],$_POST['dest_country'],$_POST['dest_city'],$_POST['travel_date'],$_POST['transport_type'],$_POST['contact_name'],$_POST['email'],$_POST['phone'],$_POST['notes'],$_POST['status'],$id);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'delete_quote':
            $conn->query("DELETE FROM quote_requests WHERE id=$id");
            echo json_encode(['success'=>true]);
            break;

        case 'get_contact':
            echo json_encode($conn->query("SELECT * FROM contact_messages WHERE id=$id")->fetch_assoc());
            break;

        case 'update_contact':
            $s = $conn->prepare("UPDATE contact_messages SET name=?,email=?,phone=?,subject=?,message=? WHERE id=?");
            $s->bind_param("sssssi", $_POST['name'],$_POST['email'],$_POST['phone'],$_POST['subject'],$_POST['message'],$id);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'delete_contact':
            $conn->query("DELETE FROM contact_messages WHERE id=$id");
            echo json_encode(['success'=>true]);
            break;

        case 'get_country':
            $empty = ['country_code'=>'','country_name'=>'','pet_types'=>'','microchip'=>'','rabies_vaccination'=>'','health_certificate'=>'','import_permit'=>'','quarantine_days'=>'','additional_requirements'=>'','preparation_time'=>'','restricted_breeds'=>'','contact_info'=>''];
            $r = $id > 0 ? $conn->query("SELECT * FROM country_regulations WHERE id=$id")->fetch_assoc() : null;
            echo json_encode($r ?: $empty);
            break;

        case 'add_country':
            $qt = intval($_POST['quarantine_days'] ?? 0);
            $s = $conn->prepare("INSERT INTO country_regulations (country_code,country_name,pet_types,microchip,rabies_vaccination,health_certificate,import_permit,quarantine_days,additional_requirements,preparation_time,restricted_breeds,contact_info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
            $s->bind_param("ssssssssssss", $_POST['country_code'],$_POST['country_name'],$_POST['pet_types'],$_POST['microchip'],$_POST['rabies_vaccination'],$_POST['health_certificate'],$_POST['import_permit'],$qt,$_POST['additional_requirements'],$_POST['preparation_time'],$_POST['restricted_breeds'],$_POST['contact_info']);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'update_country':
            $qt = intval($_POST['quarantine_days'] ?? 0);
            $s = $conn->prepare("UPDATE country_regulations SET country_code=?,country_name=?,pet_types=?,microchip=?,rabies_vaccination=?,health_certificate=?,import_permit=?,quarantine_days=?,additional_requirements=?,preparation_time=?,restricted_breeds=?,contact_info=? WHERE id=?");
            $s->bind_param("ssssssssssssi", $_POST['country_code'],$_POST['country_name'],$_POST['pet_types'],$_POST['microchip'],$_POST['rabies_vaccination'],$_POST['health_certificate'],$_POST['import_permit'],$qt,$_POST['additional_requirements'],$_POST['preparation_time'],$_POST['restricted_breeds'],$_POST['contact_info'],$id);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'delete_country':
            $conn->query("DELETE FROM country_regulations WHERE id=$id");
            echo json_encode(['success'=>true]);
            break;

        case 'get_airline':
            $empty = ['airline_name'=>'','carry_on'=>'No','checked_bag'=>'No','cargo'=>'No','pet_fee'=>''];
            $r = $id > 0 ? $conn->query("SELECT * FROM airline_regulations WHERE id=$id")->fetch_assoc() : null;
            echo json_encode($r ?: $empty);
            break;

        case 'add_airline':
            $s = $conn->prepare("INSERT INTO airline_regulations (airline_name,carry_on,checked_bag,cargo,pet_fee) VALUES (?,?,?,?,?)");
            $s->bind_param("sssss", $_POST['airline_name'],$_POST['carry_on'],$_POST['checked_bag'],$_POST['cargo'],$_POST['pet_fee']);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'update_airline':
            $s = $conn->prepare("UPDATE airline_regulations SET airline_name=?,carry_on=?,checked_bag=?,cargo=?,pet_fee=? WHERE id=?");
            $s->bind_param("sssssi", $_POST['airline_name'],$_POST['carry_on'],$_POST['checked_bag'],$_POST['cargo'],$_POST['pet_fee'],$id);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'delete_airline':
            $conn->query("DELETE FROM airline_regulations WHERE id=$id");
            echo json_encode(['success'=>true]);
            break;

        case 'get_client':
            echo json_encode($conn->query("SELECT * FROM clients WHERE id=$id")->fetch_assoc());
            break;

        case 'add_client':
            $s = $conn->prepare("INSERT INTO clients (username,password,full_name,email,phone) VALUES (?,?,?,?,?)");
            $s->bind_param("sssss", $_POST['username'],$_POST['password'],$_POST['full_name'],$_POST['email'],$_POST['phone']);
            echo json_encode(['success'=>$s->execute(), 'id'=>$conn->insert_id]);
            break;

        case 'update_client':
            $s = $conn->prepare("UPDATE clients SET username=?,password=?,full_name=?,email=?,phone=? WHERE id=?");
            $s->bind_param("sssssi", $_POST['username'],$_POST['password'],$_POST['full_name'],$_POST['email'],$_POST['phone'],$id);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'delete_client':
            $conn->query("DELETE FROM clients WHERE id=$id");
            echo json_encode(['success'=>true]);
            break;

        case 'list_clients':
            echo json_encode($conn->query("SELECT * FROM clients ORDER BY created_at DESC")->fetch_all(MYSQLI_ASSOC));
            break;

        case 'get_pet':
            echo json_encode($conn->query("SELECT cp.*,c.full_name as client_name FROM client_pets cp LEFT JOIN clients c ON cp.client_id=c.id WHERE cp.id=$id")->fetch_assoc());
            break;

        case 'add_pet':
            $s = $conn->prepare("INSERT INTO client_pets (client_id,pet_name,pet_type,breed,weight,microchip) VALUES (?,?,?,?,?,?)");
            $s->bind_param("isssss", $_POST['client_id'],$_POST['pet_name'],$_POST['pet_type'],$_POST['breed'],$_POST['weight'],$_POST['microchip']);
            echo json_encode(['success'=>$s->execute(), 'id'=>$conn->insert_id]);
            break;

        case 'update_pet':
            $s = $conn->prepare("UPDATE client_pets SET client_id=?,pet_name=?,pet_type=?,breed=?,weight=?,microchip=? WHERE id=?");
            $s->bind_param("isssssi", $_POST['client_id'],$_POST['pet_name'],$_POST['pet_type'],$_POST['breed'],$_POST['weight'],$_POST['microchip'],$id);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'delete_pet':
            $conn->query("DELETE FROM client_pets WHERE id=$id");
            echo json_encode(['success'=>true]);
            break;

        case 'list_pets':
            echo json_encode($conn->query("SELECT cp.*,c.full_name as client_name FROM client_pets cp LEFT JOIN clients c ON cp.client_id=c.id ORDER BY cp.created_at DESC")->fetch_all(MYSQLI_ASSOC));
            break;

        case 'get_service':
            echo json_encode($conn->query("SELECT cs.*,cp.pet_name,c.full_name as client_name FROM client_services cs LEFT JOIN client_pets cp ON cs.pet_id=cp.id LEFT JOIN clients c ON cs.client_id=c.id WHERE cs.id=$id")->fetch_assoc());
            break;

        case 'add_service':
            $s = $conn->prepare("INSERT INTO client_services (client_id,pet_id,origin_country,origin_city,dest_country,dest_city,transport_type,travel_date,current_status) VALUES (?,?,?,?,?,?,?,?,?)");
            $s->bind_param("iisssssss", $_POST['client_id'],$_POST['pet_id'],$_POST['origin_country'],$_POST['origin_city'],$_POST['dest_country'],$_POST['dest_city'],$_POST['transport_type'],$_POST['travel_date'],$_POST['current_status']);
            $s->execute();
            $nid = $conn->insert_id;
            foreach (['consultation','documents','transfer_booking','pet_pickup','safe_transport','delivery'] as $st) {
                $conn->query("INSERT INTO service_sop (service_id,stage,status) VALUES ($nid,'$st','pending')");
            }
            echo json_encode(['success'=>true]);
            break;

        case 'update_service':
            $s = $conn->prepare("UPDATE client_services SET client_id=?,pet_id=?,origin_country=?,origin_city=?,dest_country=?,dest_city=?,transport_type=?,travel_date=?,current_status=? WHERE id=?");
            $s->bind_param("iisssssssi", $_POST['client_id'],$_POST['pet_id'],$_POST['origin_country'],$_POST['origin_city'],$_POST['dest_country'],$_POST['dest_city'],$_POST['transport_type'],$_POST['travel_date'],$_POST['current_status'],$id);
            echo json_encode(['success'=>$s->execute()]);
            break;

        case 'delete_service':
            $conn->query("DELETE FROM service_sop WHERE service_id=$id");
            $conn->query("DELETE FROM client_services WHERE id=$id");
            echo json_encode(['success'=>true]);
            break;

        case 'list_services':
            echo json_encode($conn->query("SELECT cs.*,cp.pet_name,c.full_name as client_name FROM client_services cs LEFT JOIN client_pets cp ON cs.pet_id=cp.id LEFT JOIN clients c ON cs.client_id=c.id ORDER BY cs.created_at DESC")->fetch_all(MYSQLI_ASSOC));
            break;

        case 'get_sop':
            echo json_encode($conn->query("SELECT * FROM service_sop WHERE service_id=$id ORDER BY id ASC")->fetch_all(MYSQLI_ASSOC));
            break;

        case 'update_sop':
            $new_status = $_POST['status'];
            $completed_date = ($new_status === 'completed') ? date('Y-m-d H:i:s') : null;
            $s = $conn->prepare("UPDATE service_sop SET status=?,completed_date=? WHERE id=?");
            $s->bind_param("ssi", $new_status, $completed_date, $id);
            $ok = $s->execute();
            $sid_q = $conn->query("SELECT service_id, stage FROM service_sop WHERE id=$id");
            if ($row = $sid_q->fetch_assoc()) {
                $sid = intval($row['service_id']);
                if ($new_status === 'completed') {
                    $next = $conn->query("SELECT stage FROM service_sop WHERE service_id=$sid AND status='pending' ORDER BY id ASC LIMIT 1")->fetch_assoc();
                    $next_stage = $next ? $next['stage'] : 'delivery';
                } else {
                    $next_stage = $row['stage'];
                }
                $conn->query("UPDATE client_services SET current_status='$next_stage' WHERE id=$sid");
            }
            echo json_encode(['success'=>$ok]);
            break;

        case 'send_message':
            $cid = intval($_POST['client_id'] ?? 0);
            $subj = trim($_POST['subject'] ?? '');
            $msg  = trim($_POST['message'] ?? '');
            if ($cid > 0 && $msg !== '') {
                $s = $conn->prepare("INSERT INTO client_messages (client_id,sender,subject,message) VALUES (?,'admin',?,?)");
                $s->bind_param("iss", $cid, $subj, $msg);
                echo json_encode(['success'=>$s->execute()]);
            } else {
                echo json_encode(['success'=>false]);
            }
            break;

        case 'get_messages':
            $cid = intval($_GET['client_id'] ?? 0);
            echo json_encode($conn->query("SELECT * FROM client_messages WHERE client_id=$cid ORDER BY created_at DESC LIMIT 50")->fetch_all(MYSQLI_ASSOC));
            break;

        case 'get_unread_count':
            $cid = intval($_GET['client_id'] ?? 0);
            $r = $conn->query("SELECT COUNT(*) as c FROM client_messages WHERE client_id=$cid AND is_read=0 AND sender='client'")->fetch_assoc();
            echo json_encode(['count'=>$r ? $r['c'] : 0]);
            break;

    }

    $conn->close();
    exit;
}

/* =====================================================
   STATS & DATA
   ===================================================== */
$q_res = $conn->query("SELECT COUNT(*) as c FROM quote_requests")->fetch_assoc();
$c_res = $conn->query("SELECT COUNT(*) as c FROM contact_messages")->fetch_assoc();
$co_res = $conn->query("SELECT COUNT(*) as c FROM country_regulations")->fetch_assoc();
$a_res = $conn->query("SELECT COUNT(*) as c FROM airline_regulations")->fetch_assoc();
$cl_res = $conn->query("SELECT COUNT(*) as c FROM clients")->fetch_assoc();
$pt_res = $conn->query("SELECT COUNT(*) as c FROM client_pets")->fetch_assoc();
$s_res = $conn->query("SELECT COUNT(*) as c FROM client_services")->fetch_assoc();

$stats = [
    'quotes'   => $q_res ? $q_res['c'] : 0,
    'contacts' => $c_res ? $c_res['c'] : 0,
    'countries'=> $co_res ? $co_res['c'] : 0,
    'airlines' => $a_res ? $a_res['c'] : 0,
    'clients'  => $cl_res ? $cl_res['c'] : 0,
    'pets'     => $pt_res ? $pt_res['c'] : 0,
    'services' => $s_res ? $s_res['c'] : 0,
];

$quote_rows = $conn->query("SELECT * FROM quote_requests ORDER BY created_at DESC");
$quotes = [];
while ($r = $quote_rows->fetch_assoc()) $quotes[] = $r;

$contact_rows = $conn->query("SELECT * FROM contact_messages ORDER BY created_at DESC");
$contacts = [];
while ($r = $contact_rows->fetch_assoc()) $contacts[] = $r;

$country_rows = $conn->query("SELECT * FROM country_regulations ORDER BY country_name");
$countries = [];
while ($r = $country_rows->fetch_assoc()) $countries[] = $r;

$airline_rows = $conn->query("SELECT * FROM airline_regulations ORDER BY airline_name");
$airlines = [];
while ($r = $airline_rows->fetch_assoc()) $airlines[] = $r;

$client_rows = $conn->query("SELECT * FROM clients ORDER BY created_at DESC");
$clients = [];
while ($r = $client_rows->fetch_assoc()) $clients[] = $r;

$pet_rows = $conn->query("SELECT cp.*,c.full_name as client_name FROM client_pets cp LEFT JOIN clients c ON cp.client_id=c.id ORDER BY cp.created_at DESC");
$pets = [];
while ($r = $pet_rows->fetch_assoc()) $pets[] = $r;

$service_rows = $conn->query("SELECT cs.*,cp.pet_name,c.full_name as client_name FROM client_services cs LEFT JOIN client_pets cp ON cs.pet_id=cp.id LEFT JOIN clients c ON cs.client_id=c.id ORDER BY cs.created_at DESC");
$services = [];
while ($r = $service_rows->fetch_assoc()) $services[] = $r;

$conn->close();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PetFly USA Admin</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f0f2f5;color:#333}

/* ===== SIDEBAR ===== */
.sidebar{width:240px;height:100vh;background:#1E3A5F;position:fixed;left:0;top:0;display:flex;flex-direction:column;transition:width .3s;z-index:200}
.sidebar.collapsed{width:64px}
.sidebar-header{padding:20px 16px 12px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:10px;overflow:hidden}
.sidebar-logo{font-size:22px;color:#fff}
.sidebar-brand{font-size:15px;font-weight:700;color:#fff;white-space:nowrap}
.sidebar-nav{flex:1;overflow-y:auto;padding:12px 8px}
.nav-section{margin-bottom:20px}
.nav-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.35);padding:0 8px 6px;white-space:nowrap;overflow:hidden}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;color:rgba(255,255,255,.65);cursor:pointer;transition:background .15s,color .15s;font-size:14px;white-space:nowrap;border:none;background:none;width:100%;text-align:left}
.nav-item:hover{background:rgba(255,255,255,.1);color:#fff}
.nav-item.active{background:rgba(255,255,255,.15);color:#fff;font-weight:600}
.nav-item i{width:20px;text-align:center;flex-shrink:0;font-size:15px}
.nav-item .nav-label{white-space:nowrap;overflow:hidden}
.nav-item .badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:10px;font-size:11px;font-weight:700;margin-left:auto;background:rgba(255,255,255,.2)}
.nav-item .badge.green{background:#27ae60}
.nav-item .badge.orange{background:#e67e22}
.nav-item .badge.purple{background:#9b59b6}
.sidebar-footer{padding:12px 8px;border-top:1px solid rgba(255,255,255,.1)}
.sidebar-stat{padding:4px 8px}
.sidebar-stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:rgba(255,255,255,.35)}
.sidebar-stat-val{font-size:16px;font-weight:700;color:#fff}
.logout-btn{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;color:rgba(255,255,255,.5);cursor:pointer;font-size:14px;transition:background .15s;margin-top:4px;border:none;background:none;width:100%;text-align:left}
.logout-btn:hover{background:rgba(255,255,255,.1);color:#fff}
.toggle-btn{position:absolute;right:-12px;top:20px;width:24px;height:24px;background:#1E3A5F;border:2px solid #f0f2f5;border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;z-index:300;transition:transform .2s}
.toggle-btn:hover{transform:scale(1.1)}

/* ===== MAIN ===== */
.main{margin-left:240px;height:100vh;display:flex;flex-direction:column;transition:margin-left .3s}
.main.expanded{margin-left:64px}
.topbar{height:60px;background:#fff;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:100}
.topbar-title{font-size:18px;font-weight:700;color:#1E3A5F}
.topbar-sub{font-size:13px;color:#888}
.topbar-actions{display:flex;gap:8px}
.page-content{flex:1;overflow-y:auto;padding:28px}

/* ===== CARDS ===== */
.card{background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:20px;overflow:hidden}
.card-header{padding:16px 20px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center}
.card-header h2{font-size:15px;color:#1E3A5F;font-weight:700;display:flex;align-items:center;gap:8px}
.card-body{padding:0}

/* ===== TABLES ===== */
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:10px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#888;background:#fafafa;border-bottom:2px solid #f0f0f0}
td{padding:12px 14px;border-bottom:1px solid #f5f5f5;font-size:14px;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#f8f9fa}
.empty{text-align:center;padding:60px 20px;color:#bbb}
.empty i{font-size:42px;display:block;margin-bottom:12px}
.empty h3{font-size:15px;color:#999;margin-bottom:4px}
.empty p{font-size:13px;color:#ccc}

/* ===== BUTTONS ===== */
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;text-decoration:none}
.btn-primary{background:#1E3A5F;color:#fff}
.btn-primary:hover{background:#2c4a6e}
.btn-success{background:#27ae60;color:#fff}
.btn-success:hover{background:#219a52}
.btn-danger{background:#e74c3c;color:#fff}
.btn-danger:hover{background:#c0392b}
.btn-sm{padding:5px 10px;font-size:12px}
.action-btns{display:flex;gap:4px}
.action-btns button{padding:5px 8px;border:none;border-radius:5px;cursor:pointer;font-size:12px;transition:background .15s}

/* ===== BADGES ===== */
.badge2{display:inline-block;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600}
.bg-new{background:#e8f4fd;color:#1976d2}
.bg-pending{background:#fff3e0;color:#e65100}
.bg-approved{background:#e8f5e9;color:#2e7d32}
.bg-rejected{background:#ffebee;color:#c62828}
.bg-in_progress{background:#fff8e1;color:#f57f17}
.bg-completed{background:#e0f2f1;color:#00695c}
.status-new{background:#e3f2fd;color:#1565c0;padding:2px 8px;border-radius:12px;font-size:12px}
.status-pending{background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:12px;font-size:12px}
.status-approved{background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:12px;font-size:12px}
.status-rejected{background:#ffebee;color:#c62828;padding:2px 8px;border-radius:12px;font-size:12px}
.status-in_progress{background:#fff8e1;color:#f57f17;padding:2px 8px;border-radius:12px;font-size:12px}
.status-completed{background:#e0f2f1;color:#00695c;padding:2px 8px;border-radius:12px;font-size:12px}

/* ===== MODALS ===== */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:1000}
.modal-overlay.active{display:flex}
.modal-box{background:#fff;border-radius:14px;width:560px;max-width:95vw;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.modal-header{padding:16px 20px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.modal-header h3{font-size:16px;color:#1E3A5F;font-weight:700}
.modal-close{border:none;background:none;font-size:22px;cursor:pointer;color:#999;padding:0;line-height:1}
.modal-close:hover{color:#333}
.modal-body{padding:20px;overflow-y:auto;flex:1}
.modal-footer{padding:14px 20px;border-top:1px solid #f0f0f0;display:flex;justify-content:flex-end;gap:8px}

/* ===== FORMS ===== */
.form-group{margin-bottom:14px}
.form-group label{display:block;font-size:12px;font-weight:700;color:#555;margin-bottom:5px;text-transform:uppercase;letter-spacing:.3px}
.form-control{width:100%;padding:9px 12px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;font-family:inherit;transition:border-color .15s}
.form-control:focus{outline:none;border-color:#1E3A5F}
textarea.form-control{resize:vertical;min-height:70px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
select.form-control{background:#fff}

/* ===== TOAST ===== */
.toast{position:fixed;bottom:24px;right:24px;background:#1a1a2e;color:#fff;padding:13px 20px;border-radius:10px;font-size:14px;font-weight:500;z-index:9999;display:none;box-shadow:0 4px 20px rgba(0,0,0,.25)}
.toast.show{display:block}
.toast.success{background:#27ae60}
.toast.error{background:#e74c3c}

/* ===== SOP ===== */
.sop-stage{background:#f8f9fa;border-radius:10px;padding:13px 15px;margin-bottom:8px;border-left:4px solid #ddd;transition:border-color .2s}
.sop-stage.done{border-left-color:#27ae60;background:#e8f5e9}
.sop-stage.active{border-left-color:#f39c12;background:#fff8e1}
.sop-stage h4{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#333;margin-bottom:8px}
.sop-stage select{font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid #ddd;background:#fff}
.sop-date{font-size:11px;color:#888;margin-top:4px}

/* ===== UTILS ===== */
.text-muted{color:#888}
.text-sm{font-size:12px}
.mt-1{margin-top:8px}.mt-2{margin-top:16px}.mb-1{margin-bottom:8px}.mb-2{margin-bottom:16px}
.flex{display:flex;align-items:center;gap:6px}
.hidden{display:none}
</style>
</head>
<body>

<!-- SIDEBAR -->
<div class="sidebar" id="sidebar">
  <div style="position:relative">
    <button class="toggle-btn" id="toggleBtn" onclick="toggleSidebar()"><i class="fas fa-chevron-left" id="toggleIcon"></i></button>
    <div class="sidebar-header">
      <div class="sidebar-logo"><i class="fas fa-paw"></i></div>
      <div class="sidebar-brand">PetFly USA</div>
    </div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section">
      <div class="nav-section-title">Inbox</div>
      <button class="nav-item active" id="nav-q" onclick="showPage('q')">
        <i class="fas fa-file-invoice"></i>
        <span class="nav-label">Quotes</span>
        <span class="badge"><?php echo $stats['quotes']; ?></span>
      </button>
      <button class="nav-item" id="nav-c" onclick="showPage('c')">
        <i class="fas fa-envelope"></i>
        <span class="nav-label">Messages</span>
        <span class="badge"><?php echo $stats['contacts']; ?></span>
      </button>
    </div>
    <div class="nav-section">
      <div class="nav-section-title">Reference Data</div>
      <button class="nav-item" id="nav-co" onclick="showPage('co')">
        <i class="fas fa-globe"></i>
        <span class="nav-label">Countries</span>
      </button>
      <button class="nav-item" id="nav-a" onclick="showPage('a')">
        <i class="fas fa-plane"></i>
        <span class="nav-label">Airlines</span>
      </button>
    </div>
    <div class="nav-section">
      <div class="nav-section-title">Client Services</div>
      <button class="nav-item" id="nav-cl" onclick="showPage('cl')">
        <i class="fas fa-user-friends"></i>
        <span class="nav-label">Clients</span>
        <span class="badge green"><?php echo $stats['clients']; ?></span>
      </button>
      <button class="nav-item" id="nav-pt" onclick="showPage('pt')">
        <i class="fas fa-paw"></i>
        <span class="nav-label">Pets</span>
        <span class="badge orange"><?php echo $stats['pets']; ?></span>
      </button>
      <button class="nav-item" id="nav-sv" onclick="showPage('sv')">
        <i class="fas fa-shipping-fast"></i>
        <span class="nav-label">Services</span>
        <span class="badge purple"><?php echo $stats['services']; ?></span>
      </button>
      <button class="nav-item" id="nav-msgs" onclick="showPage('msgs')">
        <i class="fas fa-comment-dots"></i>
        <span class="nav-label">Client Msgs</span>
      </button>
    </div>
  </nav>
  <div class="sidebar-footer">
    <div class="sidebar-stat">
      <div class="sidebar-stat-label">Total Clients</div>
      <div class="sidebar-stat-val"><?php echo $stats['clients']; ?></div>
    </div>
    <button class="logout-btn" onclick="window.location='admin.php?logout'">
      <i class="fas fa-sign-out-alt"></i>
      <span class="nav-label">Logout</span>
    </button>
  </div>
</div>

<!-- MAIN -->
<div class="main" id="main">
  <div class="topbar">
    <div>
      <div class="topbar-title" id="topbar-title">Quote Requests</div>
      <div class="topbar-sub" id="topbar-sub">Manage incoming quote submissions</div>
    </div>
    <div class="topbar-actions" id="topbar-actions"></div>
  </div>
  <div class="page-content" id="page-content"></div>
</div>

<!-- MODALS -->
<div class="modal-overlay" id="mo-quote-view"><div class="modal-box"><div class="modal-header"><h3>Quote Details</h3><button class="modal-close" onclick="closeModal('mo-quote-view')">&#x2715;</button></div><div class="modal-body" id="mo-qv-bd"></div></div></div>
<div class="modal-overlay" id="mo-quote-edit"><div class="modal-box"><div class="modal-header"><h3>Edit Quote</h3><button class="modal-close" onclick="closeModal('mo-quote-edit')">&#x2715;</button></div><div class="modal-body" id="mo-qe-bd"></div><div class="modal-footer"><button class="btn btn-primary" onclick="saveQuote()">Save Changes</button></div></div></div>
<div class="modal-overlay" id="mo-msg-view"><div class="modal-box"><div class="modal-header"><h3>Message</h3><button class="modal-close" onclick="closeModal('mo-msg-view')">&#x2715;</button></div><div class="modal-body" id="mo-cv-bd"></div></div></div>
<div class="modal-overlay" id="mo-country"><div class="modal-box"><div class="modal-header"><h3 id="mo-co-tt">Country</h3><button class="modal-close" onclick="closeModal('mo-country')">&#x2715;</button></div><div class="modal-body" id="mo-co-bd"></div><div class="modal-footer"><button class="btn btn-primary" onclick="saveCountry()">Save</button></div></div></div>
<div class="modal-overlay" id="mo-airline"><div class="modal-box"><div class="modal-header"><h3 id="mo-al-tt">Airline</h3><button class="modal-close" onclick="closeModal('mo-airline')">&#x2715;</button></div><div class="modal-body" id="mo-al-bd"></div><div class="modal-footer"><button class="btn btn-primary" onclick="saveAirline()">Save</button></div></div></div>
<div class="modal-overlay" id="mo-client"><div class="modal-box"><div class="modal-header"><h3 id="mo-cl-tt">Client</h3><button class="modal-close" onclick="closeModal('mo-client')">&#x2715;</button></div><div class="modal-body" id="mo-cl-bd"></div><div class="modal-footer"><button class="btn btn-primary" onclick="saveClient()">Save</button></div></div></div>
<div class="modal-overlay" id="mo-pet"><div class="modal-box"><div class="modal-header"><h3 id="mo-pt-tt">Pet</h3><button class="modal-close" onclick="closeModal('mo-pet')">&#x2715;</button></div><div class="modal-body" id="mo-pt-bd"></div><div class="modal-footer"><button class="btn btn-primary" onclick="savePet()">Save</button></div></div></div>
<div class="modal-overlay" id="mo-service"><div class="modal-box"><div class="modal-header"><h3 id="mo-sv-tt">Service</h3><button class="modal-close" onclick="closeModal('mo-service')">&#x2715;</button></div><div class="modal-body" id="mo-sv-bd"></div><div class="modal-footer"><button class="btn btn-primary" onclick="saveService()">Save</button></div></div></div>
<div class="modal-overlay" id="mo-sop"><div class="modal-box" style="max-width:600px"><div class="modal-header"><h3>SOP Tracking</h3><button class="modal-close" onclick="closeModal('mo-sop')">&#x2715;</button></div><div class="modal-body" id="mo-sop-bd"></div></div></div>
<div class="modal-overlay" id="mo-sendmsg"><div class="modal-box"><div class="modal-header"><h3>Send Message</h3><button class="modal-close" onclick="closeModal('mo-sendmsg')">&#x2715;</button></div><div class="modal-body" id="mo-sendmsg-bd"></div><div class="modal-footer"><button class="btn btn-primary" onclick="sendMessage()">Send Message</button></div></div></div>
<div class="modal-overlay" id="mo-viewmsgs"><div class="modal-box" style="max-width:680px"><div class="modal-header"><h3>Client Messages</h3><button class="modal-close" onclick="closeModal('mo-viewmsgs')">&#x2715;</button></div><div class="modal-body" id="mo-viewmsgs-bd" style="max-height:60vh;overflow-y:auto"></div></div></div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<script>
// ── DATA ──────────────────────────────────────────────
var QUOTES   = <?php echo json_encode($quotes); ?>;
var CONTACTS = <?php echo json_encode($contacts); ?>;
var COUNTRIES= <?php echo json_encode($countries); ?>;
var AIRLINES = <?php echo json_encode($airlines); ?>;
var CLIENTS  = <?php echo json_encode($clients); ?>;
var PETS     = <?php echo json_encode($pets); ?>;
var SERVICES = <?php echo json_encode($services); ?>;

// ── STATE ──────────────────────────────────────────────
var currentPage = 'q';
var editId = 0;

// ── PAGE META ─────────────────────────────────────────
var PAGE_META = {
  q:   { title:'Quote Requests', sub:'Manage incoming quote submissions', actions:'' },
  c:   { title:'Messages',       sub:'Contact form submissions',          actions:'' },
  co:  { title:'Country Regulations', sub:'Import rules by destination country', actions:'<button class="btn btn-success" onclick="openCountry(0)"><i class="fas fa-plus"></i> Add Country</button>' },
  a:   { title:'Airlines',       sub:'Pet travel policies by airline',   actions:'<button class="btn btn-success" onclick="openAirline(0)"><i class="fas fa-plus"></i> Add Airline</button>' },
  cl:  { title:'Clients',        sub:'Client accounts',                   actions:'<button class="btn btn-success" onclick="openClient(0)"><i class="fas fa-plus"></i> Add Client</button>' },
  pt:  { title:'Pets',           sub:'Registered pets',                   actions:'<button class="btn btn-success" onclick="openPet(0)"><i class="fas fa-plus"></i> Add Pet</button>' },
  sv:  { title:'Services',       sub:'Active pet transport services',     actions:'<button class="btn btn-success" onclick="openService(0)"><i class="fas fa-plus"></i> Add Service</button>' },
  msgs:{ title:'Client Messages', sub:'Messages sent to clients',         actions:'' },
};

// ── SIDEBAR TOGGLE ─────────────────────────────────────
function toggleSidebar(){
  var s = document.getElementById('sidebar');
  var m = document.getElementById('main');
  s.classList.toggle('collapsed');
  m.classList.toggle('expanded');
  var icon = document.getElementById('toggleIcon');
  icon.className = s.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
}

// ── NAVIGATION ─────────────────────────────────────────
function showPage(page){
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(function(el){ el.classList.remove('active'); });
  var navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');
  document.getElementById('topbar-title').textContent = PAGE_META[page].title;
  document.getElementById('topbar-sub').textContent   = PAGE_META[page].sub;
  document.getElementById('topbar-actions').innerHTML = PAGE_META[page].actions || '';
  var html = '';
  switch(page){
    case 'q':   html = renderQuotes();   break;
    case 'c':   html = renderMessages(); break;
    case 'co':  html = renderCountries(); break;
    case 'a':   html = renderAirlines();  break;
    case 'cl': html = renderClients();   break;
    case 'pt':  html = renderPets();      break;
    case 'sv':  html = renderServices();  break;
    case 'msgs':html = renderClientMsgs(); break;
  }
  document.getElementById('page-content').innerHTML = html;
}

// ── UTILS ──────────────────────────────────────────────
function esc(s){
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toast(msg, type){
  var t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + (type || 'success') + ' show';
  setTimeout(function(){ t.className = 'toast'; }, 3000);
}
function openModal(id){ document.getElementById(id).classList.add('active'); }
function closeModal(id){ document.getElementById(id).classList.remove('active'); }
function statusHtml(s){
  var m = {'new':'status-new','pending':'status-pending','approved':'status-approved','rejected':'status-rejected','in_progress':'status-in_progress','completed':'status-completed'};
  var cls = m[s] || 'status-new';
  var label = (s || 'new').charAt(0).toUpperCase() + (s || 'new').slice(1);
  return '<span class="' + cls + '">' + label + '</span>';
}
function emptyState(icon, title, msg){
  return '<div class="empty"><i class="fas fa-' + icon + '"></i><h3>' + title + '</h3><p>' + msg + '</p></div>';
}

// ── API ────────────────────────────────────────────────
function api(action, data, method){
  method = method || 'GET';
  var url = 'admin.php?action=' + action;
  var opts = { method: method, headers: {'Content-Type':'application/x-www-form-urlencoded'} };
  if (data && method === 'POST') {
    opts.body = Object.keys(data).map(function(k){ return encodeURIComponent(k)+'='+encodeURIComponent(data[k]); }).join('&');
  } else if (data) {
    url += '&' + Object.keys(data).map(function(k){ return encodeURIComponent(k)+'='+encodeURIComponent(data[k]); }).join('&');
  }
  return fetch(url, opts).then(function(r){ return r.json(); });
}

// ── QUOTES ─────────────────────────────────────────────
function renderQuotes(){
  if (QUOTES.length === 0) return '<div class="card"><div class="card-header"><h2><i class="fas fa-file-invoice"></i> Quote Requests</h2></div><div class="card-body">' + emptyState('inbox','No Quotes Yet','Quote requests will appear here') + '</div></div>';
  var h = '<div class="card"><div class="card-header"><h2><i class="fas fa-file-invoice"></i> Quote Requests</h2></div><div class="card-body"><table><thead><tr><th>ID</th><th>Date</th><th>Client</th><th>Pet</th><th>Route</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  QUOTES.forEach(function(r){
    h += '<tr>' +
      '<td>#' + r.id + '</td>' +
      '<td>' + new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + '</td>' +
      '<td><strong>' + esc(r.contact_name) + '</strong><br><small class="text-muted">' + esc(r.email) + '</small></td>' +
      '<td>' + esc(r.pet_type) + '<br><small class="text-muted">' + esc(r.pet_name) + '</small></td>' +
      '<td>' + esc(r.origin_city) + ' &#8594; ' + esc(r.dest_city) + '</td>' +
      '<td>' + statusHtml(r.status) + '</td>' +
      '<td><div class="action-btns"><button class="btn-primary btn-sm" onclick="viewQuote(' + r.id + ')" title="View"><i class="fas fa-eye"></i></button><button class="btn-primary btn-sm" onclick="editQuote(' + r.id + ')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn-danger btn-sm" onclick="deleteQuote(' + r.id + ')" title="Delete"><i class="fas fa-trash"></i></button></div></td>' +
      '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

function viewQuote(id){
  var d = QUOTES.find(function(q){ return q.id == id; });
  if (!d) return;
  var body = document.getElementById('mo-qv-bd');
  body.innerHTML =
    '<div class="form-row"><div class="form-group"><label>Name</label><p>' + esc(d.contact_name || 'N/A') + '</p></div><div class="form-group"><label>Email</label><p><a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a></p></div></div>' +
    '<div class="form-row"><div class="form-group"><label>Phone</label><p>' + esc(d.phone || '—') + '</p></div><div class="form-group"><label>Status</label><p>' + statusHtml(d.status) + '</p></div></div>' +
    '<div class="form-row"><div class="form-group"><label>Pet</label><p>' + esc(d.pet_type) + ' — ' + esc(d.pet_name) + '</p></div><div class="form-group"><label>Breed</label><p>' + esc(d.breed || 'N/A') + '</p></div></div>' +
    '<div class="form-row"><div class="form-group"><label>Origin</label><p>' + esc(d.origin_city) + ', ' + esc(d.origin_country) + '</p></div><div class="form-group"><label>Destination</label><p>' + esc(d.dest_city) + ', ' + esc(d.dest_country) + '</p></div></div>' +
    '<div class="form-group"><label>Travel Date</label><p>' + esc(d.travel_date || 'TBD') + ' &nbsp;|&nbsp; ' + esc(d.transport_type) + '</p></div>' +
    '<div class="form-group"><label>Notes</label><p style="white-space:pre-wrap">' + esc(d.notes || 'No notes') + '</p></div>';
  openModal('mo-quote-view');
}

function editQuote(id){
  editId = id;
  var d = QUOTES.find(function(q){ return q.id == id; });
  if (!d) return;
  var so = ['new','pending','approved','rejected'].map(function(s){ return '<option' + (d.status===s?' selected':'') + '>' + s + '</option>'; }).join('');
  document.getElementById('mo-qe-bd').innerHTML =
    '<form id="qf">' +
    '<div class="form-row"><div class="form-group"><label>Name</label><input class="form-control" name="contact_name" value="' + esc(d.contact_name) + '"></div><div class="form-group"><label>Email</label><input class="form-control" name="email" value="' + esc(d.email) + '"></div></div>' +
    '<div class="form-row"><div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="' + esc(d.phone) + '"></div><div class="form-group"><label>Status</label><select class="form-control" name="status">' + so + '</select></div></div>' +
    '<div class="form-group"><label>Notes</label><textarea class="form-control" name="notes" rows="3">' + esc(d.notes) + '</textarea></div>' +
    '</form>';
  openModal('mo-quote-edit');
}

function saveQuote(){
  var fd = new FormData(document.getElementById('qf'));
  fd.append('id', editId);
  api('update_quote', fd, 'POST').then(function(d){
    if (d.success) {
      closeModal('mo-quote-edit');
      toast('Quote updated!');
      location.reload();
    } else {
      toast('Error saving','error');
    }
  });
}

function deleteQuote(id){
  if (!confirm('Delete this quote?')) return;
  api('delete_quote', {id:id}, 'POST').then(function(){
    toast('Quote deleted');
    location.reload();
  });
}

// ── MESSAGES ───────────────────────────────────────────
function renderMessages(){
  if (CONTACTS.length === 0) return '<div class="card"><div class="card-header"><h2><i class="fas fa-envelope"></i> Messages</h2></div><div class="card-body">' + emptyState('envelope-open','No Messages','Contact submissions will appear here') + '</div></div>';
  var h = '<div class="card"><div class="card-header"><h2><i class="fas fa-envelope"></i> Messages</h2></div><div class="card-body"><table><thead><tr><th>ID</th><th>Date</th><th>Name</th><th>Email</th><th>Subject</th><th>Actions</th></tr></thead><tbody>';
  CONTACTS.forEach(function(r){
    h += '<tr>' +
      '<td>#' + r.id + '</td>' +
      '<td>' + new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + '</td>' +
      '<td><strong>' + esc(r.name) + '</strong></td>' +
      '<td><a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a></td>' +
      '<td>' + esc(r.subject) + '</td>' +
      '<td><div class="action-btns"><button class="btn-primary btn-sm" onclick="viewMessage(' + r.id + ')"><i class="fas fa-eye"></i></button><button class="btn-danger btn-sm" onclick="deleteMessage(' + r.id + ')"><i class="fas fa-trash"></i></button></div></td>' +
      '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

function viewMessage(id){
  var d = CONTACTS.find(function(c){ return c.id == id; });
  if (!d) return;
  document.getElementById('mo-cv-bd').innerHTML =
    '<div class="form-row"><div class="form-group"><label>Name</label><p>' + esc(d.name) + '</p></div><div class="form-group"><label>Email</label><p><a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a></p></div></div>' +
    '<div class="form-group"><label>Subject</label><p>' + esc(d.subject) + '</p></div>' +
    '<div class="form-group"><label>Message</label><p style="white-space:pre-wrap">' + esc(d.message) + '</p></div>';
  openModal('mo-msg-view');
}

function deleteMessage(id){
  if (!confirm('Delete this message?')) return;
  api('delete_contact', {id:id}, 'POST').then(function(){
    toast('Message deleted');
    location.reload();
  });
}

// ── COUNTRIES ──────────────────────────────────────────
function renderCountries(){
  if (COUNTRIES.length === 0) return '<div class="card"><div class="card-header"><h2><i class="fas fa-globe"></i> Country Regulations</h2></div><div class="card-body">' + emptyState('globe','No Countries','Add countries to manage import regulations') + '</div></div>';
  var h = '<div class="card"><div class="card-header"><h2><i class="fas fa-globe"></i> Country Regulations</h2></div><div class="card-body"><table><thead><tr><th>Code</th><th>Country</th><th>Pet Types</th><th>Quarantine</th><th>Actions</th></tr></thead><tbody>';
  COUNTRIES.forEach(function(r){
    h += '<tr>' +
      '<td><strong>' + esc(r.country_code) + '</strong></td>' +
      '<td>' + esc(r.country_name) + '</td>' +
      '<td>' + esc(r.pet_types || '—') + '</td>' +
      '<td>' + (r.quarantine_days ? r.quarantine_days + ' days' : '—') + '</td>' +
      '<td><div class="action-btns"><button class="btn-primary btn-sm" onclick="openCountry(' + r.id + ')"><i class="fas fa-edit"></i></button><button class="btn-danger btn-sm" onclick="deleteCountry(' + r.id + ')"><i class="fas fa-trash"></i></button></div></td>' +
      '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

function openCountry(id){
  editId = id;
  document.getElementById('mo-co-tt').textContent = id > 0 ? 'Edit Country' : 'Add Country';
  document.getElementById('mo-co-bd').innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ccc"></i></div>';
  openModal('mo-country');
  api('get_country', {id:id}).then(function(d){
    document.getElementById('mo-co-bd').innerHTML =
      '<form id="cof">' +
      '<div class="form-row"><div class="form-group"><label>Country Code *</label><input class="form-control" name="country_code" value="' + esc(d.country_code) + '" required></div><div class="form-group"><label>Country Name *</label><input class="form-control" name="country_name" value="' + esc(d.country_name) + '" required></div></div>' +
      '<div class="form-group"><label>Pet Types</label><input class="form-control" name="pet_types" value="' + esc(d.pet_types) + '" placeholder="e.g. Dog, Cat, Bird"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Microchip Required</label><select class="form-control" name="microchip"><option' + (d.microchip==='Yes'?' selected':'') + '>Yes</option><option' + (d.microchip==='No'?' selected':'') + '>No</option></select></div><div class="form-group"><label>Rabies Vaccination</label><select class="form-control" name="rabies_vaccination"><option' + (d.rabies_vaccination==='Yes'?' selected':'') + '>Yes</option><option' + (d.rabies_vaccination==='No'?' selected':'') + '>No</option></select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Health Certificate</label><select class="form-control" name="health_certificate"><option' + (d.health_certificate==='Yes'?' selected':'') + '>Yes</option><option' + (d.health_certificate==='No'?' selected':'') + '>No</option></select></div><div class="form-group"><label>Import Permit</label><select class="form-control" name="import_permit"><option' + (d.import_permit==='Yes'?' selected':'') + '>Yes</option><option' + (d.import_permit==='No'?' selected':'') + '>No</option></select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Quarantine Days</label><input class="form-control" name="quarantine_days" type="number" value="' + esc(d.quarantine_days) + '" placeholder="0 if none"></div><div class="form-group"><label>Preparation Time</label><input class="form-control" name="preparation_time" value="' + esc(d.preparation_time) + '" placeholder="e.g. 6 months"></div></div>' +
      '<div class="form-group"><label>Restricted Breeds</label><textarea class="form-control" name="restricted_breeds" rows="2" placeholder="Comma-separated list">' + esc(d.restricted_breeds) + '</textarea></div>' +
      '<div class="form-group"><label>Additional Requirements</label><textarea class="form-control" name="additional_requirements" rows="2">' + esc(d.additional_requirements) + '</textarea></div>' +
      '<div class="form-group"><label>Authority Contact</label><textarea class="form-control" name="contact_info" rows="2">' + esc(d.contact_info) + '</textarea></div>' +
      '</form>';
  });
}

function saveCountry(){
  var fd = new FormData(document.getElementById('cof'));
  fd.append('id', editId);
  var action = editId > 0 ? 'update_country' : 'add_country';
  api(action, fd, 'POST').then(function(d){
    if (d.success) { closeModal('mo-country'); toast('Country saved!'); location.reload(); }
    else toast('Error saving','error');
  });
}

function deleteCountry(id){
  if (!confirm('Delete this country?')) return;
  api('delete_country', {id:id}, 'POST').then(function(){ toast('Country deleted'); location.reload(); });
}

// ── AIRLINES ───────────────────────────────────────────
function renderAirlines(){
  if (AIRLINES.length === 0) return '<div class="card"><div class="card-header"><h2><i class="fas fa-plane"></i> Airlines</h2></div><div class="card-body">' + emptyState('plane','No Airlines','Add airlines to manage pet travel policies') + '</div></div>';
  var h = '<div class="card"><div class="card-header"><h2><i class="fas fa-plane"></i> Airlines</h2></div><div class="card-body"><table><thead><tr><th>Airline</th><th>Carry-On</th><th>Checked Bag</th><th>Cargo</th><th>Pet Fee</th><th>Actions</th></tr></thead><tbody>';
  AIRLINES.forEach(function(r){
    h += '<tr>' +
      '<td><strong>' + esc(r.airline_name) + '</strong></td>' +
      '<td>' + (r.carry_on === 'Yes' ? '<span class="badge2 bg-approved">Yes</span>' : '<span class="badge2 bg-rejected">No</span>') + '</td>' +
      '<td>' + (r.checked_bag === 'Yes' ? '<span class="badge2 bg-approved">Yes</span>' : '<span class="badge2 bg-rejected">No</span>') + '</td>' +
      '<td>' + (r.cargo === 'Yes' ? '<span class="badge2 bg-approved">Yes</span>' : '<span class="badge2 bg-rejected">No</span>') + '</td>' +
      '<td>' + esc(r.pet_fee || '—') + '</td>' +
      '<td><div class="action-btns"><button class="btn-primary btn-sm" onclick="openAirline(' + r.id + ')"><i class="fas fa-edit"></i></button><button class="btn-danger btn-sm" onclick="deleteAirline(' + r.id + ')"><i class="fas fa-trash"></i></button></div></td>' +
      '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

function openAirline(id){
  editId = id;
  document.getElementById('mo-al-tt').textContent = id > 0 ? 'Edit Airline' : 'Add Airline';
  document.getElementById('mo-al-bd').innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ccc"></i></div>';
  openModal('mo-airline');
  api('get_airline', {id:id}).then(function(d){
    var yn = function(v){ return '<option' + (v==='Yes'?' selected':'') + '>Yes</option><option' + (v==='No'?' selected':'') + '>No</option>'; };
    document.getElementById('mo-al-bd').innerHTML =
      '<form id="alf">' +
      '<div class="form-group"><label>Airline Name *</label><input class="form-control" name="airline_name" value="' + esc(d.airline_name) + '" required></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Carry-On Pet</label><select class="form-control" name="carry_on">' + yn(d.carry_on) + '</select></div><div class="form-group"><label>Checked Bag Pet</label><select class="form-control" name="checked_bag">' + yn(d.checked_bag) + '</select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Cargo</label><select class="form-control" name="cargo">' + yn(d.cargo) + '</select></div><div class="form-group"><label>Pet Fee</label><input class="form-control" name="pet_fee" value="' + esc(d.pet_fee) + '" placeholder="e.g. $200"></div></div>' +
      '</form>';
  });
}

function saveAirline(){
  var fd = new FormData(document.getElementById('alf'));
  fd.append('id', editId);
  var action = editId > 0 ? 'update_airline' : 'add_airline';
  api(action, fd, 'POST').then(function(d){
    if (d.success) { closeModal('mo-airline'); toast('Airline saved!'); location.reload(); }
    else toast('Error saving','error');
  });
}

function deleteAirline(id){
  if (!confirm('Delete this airline?')) return;
  api('delete_airline', {id:id}, 'POST').then(function(){ toast('Airline deleted'); location.reload(); });
}

// ── CLIENTS ────────────────────────────────────────────
function renderClients(){
  if (CLIENTS.length === 0) return '<div class="card"><div class="card-header"><h2><i class="fas fa-user-friends"></i> Clients</h2></div><div class="card-body">' + emptyState('users','No Clients','Client accounts will appear here') + '</div></div>';
  var h = '<div class="card"><div class="card-header"><h2><i class="fas fa-user-friends"></i> Clients</h2></div><div class="card-body"><table><thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead><tbody>';
  CLIENTS.forEach(function(r){
    h += '<tr>' +
      '<td>#' + r.id + '</td>' +
      '<td><strong>' + esc(r.full_name) + '</strong></td>' +
      '<td>' + esc(r.username) + '</td>' +
      '<td><a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a></td>' +
      '<td>' + esc(r.phone || '—') + '</td>' +
      '<td><div class="action-btns"><button class="btn-primary btn-sm" onclick="openClient(' + r.id + ')"><i class="fas fa-edit"></i></button><button class="btn-danger btn-sm" onclick="deleteClient(' + r.id + ')"><i class="fas fa-trash"></i></button></div></td>' +
      '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

function openClient(id){
  editId = id;
  document.getElementById('mo-cl-tt').textContent = id > 0 ? 'Edit Client' : 'Add Client';
  document.getElementById('mo-cl-bd').innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ccc"></i></div>';
  openModal('mo-client');
  if (id === 0) {
    document.getElementById('mo-cl-bd').innerHTML =
      '<form id="clf">' +
      '<div class="form-group"><label>Username *</label><input class="form-control" name="username" required></div></div>' +
      '<div class="form-group"><label>Password *</label><input class="form-control" name="password" type="password" required></div></div>' +
      '<div class="form-group"><label>Full Name *</label><input class="form-control" name="full_name" required></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" name="email" type="email"></div><div class="form-group"><label>Phone</label><input class="form-control" name="phone"></div></div>' +
      '</form>';
  } else {
    api('get_client', {id:id}).then(function(d){
      document.getElementById('mo-cl-bd').innerHTML =
        '<form id="clf">' +
        '<div class="form-row"><div class="form-group"><label>Username *</label><input class="form-control" name="username" value="' + esc(d.username) + '" required></div><div class="form-group"><label>Password *</label><input class="form-control" name="password" type="password" value="' + esc(d.password) + '" required></div></div>' +
        '<div class="form-group"><label>Full Name *</label><input class="form-control" name="full_name" value="' + esc(d.full_name) + '" required></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" name="email" type="email" value="' + esc(d.email) + '"></div><div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="' + esc(d.phone) + '"></div></div>' +
        '</form>';
    });
  }
}

function saveClient(){
  var fd = new FormData(document.getElementById('clf'));
  fd.append('id', editId);
  var action = editId > 0 ? 'update_client' : 'add_client';
  api(action, fd, 'POST').then(function(d){
    if (d.success) { closeModal('mo-client'); toast('Client saved!'); location.reload(); }
    else toast('Error saving','error');
  });
}

function deleteClient(id){
  if (!confirm('Delete this client?')) return;
  api('delete_client', {id:id}, 'POST').then(function(){ toast('Client deleted'); location.reload(); });
}

// ── PETS ───────────────────────────────────────────────
function renderPets(){
  if (PETS.length === 0) return '<div class="card"><div class="card-header"><h2><i class="fas fa-paw"></i> Pets</h2></div><div class="card-body">' + emptyState('paw','No Pets','Registered pets will appear here') + '</div></div>';
  var h = '<div class="card"><div class="card-header"><h2><i class="fas fa-paw"></i> Pets</h2></div><div class="card-body"><table><thead><tr><th>ID</th><th>Pet Name</th><th>Type</th><th>Breed</th><th>Weight</th><th>Client</th><th>Actions</th></tr></thead><tbody>';
  PETS.forEach(function(r){
    h += '<tr>' +
      '<td>#' + r.id + '</td>' +
      '<td><strong>' + esc(r.pet_name) + '</strong></td>' +
      '<td>' + esc(r.pet_type) + '</td>' +
      '<td>' + esc(r.breed || '—') + '</td>' +
      '<td>' + esc(r.weight || '—') + '</td>' +
      '<td>' + esc(r.client_name || '—') + '</td>' +
      '<td><div class="action-btns"><button class="btn-primary btn-sm" onclick="openPet(' + r.id + ')"><i class="fas fa-edit"></i></button><button class="btn-danger btn-sm" onclick="deletePet(' + r.id + ')"><i class="fas fa-trash"></i></button></div></td>' +
      '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

function openPet(id){
  editId = id;
  document.getElementById('mo-pt-tt').textContent = id > 0 ? 'Edit Pet' : 'Add Pet';
  document.getElementById('mo-pt-bd').innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ccc"></i></div>';
  openModal('mo-pet');
  var clientOptions = CLIENTS.map(function(c){ return '<option value="' + c.id + '">' + esc(c.full_name) + '</option>'; }).join('');
  if (id === 0) {
    document.getElementById('mo-pt-bd').innerHTML =
      '<form id="ptf">' +
      '<div class="form-group"><label>Client *</label><select class="form-control" name="client_id" required>' + clientOptions + '</select></div>' +
      '<div class="form-row"><div class="form-group"><label>Pet Name *</label><input class="form-control" name="pet_name" required></div><div class="form-group"><label>Type</label><select class="form-control" name="pet_type"><option>Dog</option><option>Cat</option><option>Bird</option><option>Other</option></select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Breed</label><input class="form-control" name="breed" placeholder="e.g. Golden Retriever"></div><div class="form-group"><label>Weight (kg)</label><input class="form-control" name="weight" placeholder="e.g. 12"></div></div>' +
      '<div class="form-group"><label>Microchip</label><input class="form-control" name="microchip" placeholder="e.g. 123456789012345"></div>' +
      '</form>';
  } else {
    api('get_pet', {id:id}).then(function(d){
      var sel = function(v){ return '<option' + (d.pet_type===v?' selected':'') + '>' + v + '</option>'; };
      var clientSel = CLIENTS.map(function(c){ return '<option value="' + c.id + '"' + (c.id==d.client_id?' selected':'') + '>' + esc(c.full_name) + '</option>'; }).join('');
      document.getElementById('mo-pt-bd').innerHTML =
        '<form id="ptf">' +
        '<div class="form-group"><label>Client *</label><select class="form-control" name="client_id" required>' + clientSel + '</select></div>' +
        '<div class="form-row"><div class="form-group"><label>Pet Name *</label><input class="form-control" name="pet_name" value="' + esc(d.pet_name) + '" required></div><div class="form-group"><label>Type</label><select class="form-control" name="pet_type">' + sel('Dog') + sel('Cat') + sel('Bird') + sel('Other') + '</select></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Breed</label><input class="form-control" name="breed" value="' + esc(d.breed) + '"></div><div class="form-group"><label>Weight (kg)</label><input class="form-control" name="weight" value="' + esc(d.weight) + '"></div></div>' +
        '<div class="form-group"><label>Microchip</label><input class="form-control" name="microchip" value="' + esc(d.microchip) + '"></div>' +
        '</form>';
    });
  }
}

function savePet(){
  var fd = new FormData(document.getElementById('ptf'));
  fd.append('id', editId);
  var action = editId > 0 ? 'update_pet' : 'add_pet';
  api(action, fd, 'POST').then(function(d){
    if (d.success) { closeModal('mo-pet'); toast('Pet saved!'); location.reload(); }
    else toast('Error saving','error');
  });
}

function deletePet(id){
  if (!confirm('Delete this pet?')) return;
  api('delete_pet', {id:id}, 'POST').then(function(){ toast('Pet deleted'); location.reload(); });
}

// ── SERVICES ────────────────────────────────────────────
function renderServices(){
  if (SERVICES.length === 0) return '<div class="card"><div class="card-header"><h2><i class="fas fa-shipping-fast"></i> Services</h2></div><div class="card-body">' + emptyState('shipping-fast','No Services','Active transport services will appear here') + '</div></div>';
  var h = '<div class="card"><div class="card-header"><h2><i class="fas fa-shipping-fast"></i> Services</h2></div><div class="card-body"><table><thead><tr><th>ID</th><th>Client</th><th>Pet</th><th>Route</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  SERVICES.forEach(function(r){
    h += '<tr>' +
      '<td>#' + r.id + '</td>' +
      '<td><strong>' + esc(r.client_name || '—') + '</strong></td>' +
      '<td>' + esc(r.pet_name || '—') + '</td>' +
      '<td>' + esc(r.origin_city) + ' &#8594; ' + esc(r.dest_city) + '</td>' +
      '<td>' + esc(r.transport_type || '—') + '</td>' +
      '<td>' + statusHtml(r.current_status) + '</td>' +
      '<td><div class="action-btns"><button class="btn-primary btn-sm" onclick="openService(' + r.id + ')"><i class="fas fa-edit"></i></button><button class="btn-primary btn-sm" onclick="viewSOP(' + r.id + ')"><i class="fas fa-tasks"></i></button><button class="btn-danger btn-sm" onclick="deleteService(' + r.id + ')"><i class="fas fa-trash"></i></button></div></td>' +
      '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}

function openService(id){
  editId = id;
  document.getElementById('mo-sv-tt').textContent = id > 0 ? 'Edit Service' : 'Add Service';
  document.getElementById('mo-sv-bd').innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ccc"></i></div>';
  openModal('mo-service');
  var clientOpts = CLIENTS.map(function(c){ return '<option value="' + c.id + '">' + esc(c.full_name) + '</option>'; }).join('');
  var petOpts    = PETS.map(function(p){ return '<option value="' + p.id + '">' + esc(p.pet_name) + ' (' + esc(p.client_name) + ')</option>'; }).join('');
  if (id === 0) {
    document.getElementById('mo-sv-bd').innerHTML =
      '<form id="svf">' +
      '<div class="form-row"><div class="form-group"><label>Client *</label><select class="form-control" name="client_id" required>' + clientOpts + '</select></div><div class="form-group"><label>Pet</label><select class="form-control" name="pet_id"><option value="">— None —</option>' + petOpts + '</select></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Origin Country</label><input class="form-control" name="origin_country" placeholder="e.g. US"></div><div class="form-group"><label>Origin City</label><input class="form-control" name="origin_city" placeholder="e.g. Los Angeles"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Dest Country</label><input class="form-control" name="dest_country" placeholder="e.g. CN"></div><div class="form-group"><label>Dest City</label><input class="form-control" name="dest_city" placeholder="e.g. Shanghai"></div></div>' +
      '<div class="form-row"><div class="form-group"><label>Transport Type</label><input class="form-control" name="transport_type" placeholder="e.g. air-cargo"></div><div class="form-group"><label>Travel Date</label><input class="form-control" name="travel_date" type="date"></div></div>' +
      '<div class="form-group"><label>Status</label><select class="form-control" name="current_status"><option>consultation</option><option>documents</option><option>in_progress</option><option>completed</option></select></div>' +
      '</form>';
  } else {
    api('get_service', {id:id}).then(function(d){
      var st = d.current_status || 'consultation';
      var stOpts = ['consultation','documents','transfer_booking','pet_pickup','safe_transport','delivery','in_progress','completed'].map(function(s){ return '<option' + (st===s?' selected':'') + '>' + s + '</option>'; }).join('');
      var clientSel = CLIENTS.map(function(c){ return '<option value="' + c.id + '"' + (c.id==d.client_id?' selected':'') + '>' + esc(c.full_name) + '</option>'; }).join('');
      var petSel    = PETS.map(function(p){ return '<option value="' + p.id + '"' + (p.id==d.pet_id?' selected':'') + '>' + esc(p.pet_name) + ' (' + esc(p.client_name) + ')</option>'; }).join('');
      document.getElementById('mo-sv-bd').innerHTML =
        '<form id="svf">' +
        '<div class="form-row"><div class="form-group"><label>Client *</label><select class="form-control" name="client_id" required>' + clientSel + '</select></div><div class="form-group"><label>Pet</label><select class="form-control" name="pet_id"><option value="">— None —</option>' + petSel + '</select></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Origin Country</label><input class="form-control" name="origin_country" value="' + esc(d.origin_country) + '"></div><div class="form-group"><label>Origin City</label><input class="form-control" name="origin_city" value="' + esc(d.origin_city) + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Dest Country</label><input class="form-control" name="dest_country" value="' + esc(d.dest_country) + '"></div><div class="form-group"><label>Dest City</label><input class="form-control" name="dest_city" value="' + esc(d.dest_city) + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Transport Type</label><input class="form-control" name="transport_type" value="' + esc(d.transport_type) + '"></div><div class="form-group"><label>Travel Date</label><input class="form-control" name="travel_date" value="' + esc(d.travel_date) + '" type="date"></div></div>' +
        '<div class="form-group"><label>Status</label><select class="form-control" name="current_status">' + stOpts + '</select></div>' +
        '</form>';
    });
  }
}

function saveService(){
  var fd = new FormData(document.getElementById('svf'));
  fd.append('id', editId);
  var action = editId > 0 ? 'update_service' : 'add_service';
  api(action, fd, 'POST').then(function(d){
    if (d.success) { closeModal('mo-service'); toast('Service saved!'); location.reload(); }
    else toast('Error saving','error');
  });
}

function deleteService(id){
  if (!confirm('Delete this service?')) return;
  api('delete_service', {id:id}, 'POST').then(function(){ toast('Service deleted'); location.reload(); });
}

function viewSOP(id){
  document.getElementById('mo-sop-bd').innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#ccc"></i></div>';
  openModal('mo-sop');
  api('get_sop', {id:id}).then(function(stages){
    var h = '';
    var stageLabels = {
      consultation:'Consultation',
      documents:'Documentation',
      transfer_booking:'Transfer Booking',
      pet_pickup:'Pet Pickup',
      safe_transport:'Safe Transport',
      delivery:'Delivery'
    };
    stages.forEach(function(s){
      var cls = s.status === 'completed' ? 'done' : (s.status === 'in_progress' ? 'active' : '');
      var opts = ['pending','in_progress','completed'].map(function(o){
        return '<option value="' + o + '"' + (s.status===o?' selected':'') + '>' + o.charAt(0).toUpperCase()+o.slice(1) + '</option>';
      }).join('');
      h += '<div class="sop-stage ' + cls + '">' +
        '<h4><strong>' + (stageLabels[s.stage] || s.stage) + '</strong></h4>' +
        '<select onchange="updateSOP(' + s.id + ',this.value)">' + opts + '</select>' +
        (s.completed_date ? '<div class="sop-date">Completed: ' + s.completed_date + '</div>' : '') +
        '</div>';
    });
    document.getElementById('mo-sop-bd').innerHTML = h || '<p class="text-muted">No SOP stages found.</p>';
  });
}

function updateSOP(id, status){
  api('update_sop', {id:id, status:status}, 'POST').then(function(d){
    if (d.success) toast('SOP updated!');
    else toast('Error','error');
  });
}

// ── CLIENT MESSAGES ─────────────────────────────────────
function renderClientMsgs(){
  if (CLIENTS.length === 0) return '<div class="card"><div class="card-header"><h2><i class="fas fa-comment-dots"></i> Client Messages</h2></div><div class="card-body">' + emptyState('comments','No Clients','Create client accounts first') + '</div></div>';
  var h = '<div class="card"><div class="card-header"><h2><i class="fas fa-comment-dots"></i> Client Messages</h2></div><div class="card-body"><p style="padding:16px 20px;color:#888;font-size:14px">Select a client to send or view messages.</p>';
  h += '<div style="padding:0 20px 16px"><select id="msg-client-sel" class="form-control" onchange="loadClientMsgList()" style="max-width:300px"><option value="">— Select a client —</option>';
  CLIENTS.forEach(function(c){ h += '<option value="' + c.id + '">' + esc(c.full_name) + '</option>'; });
  h += '</select></div>';
  h += '<div id="msg-list" style="padding:20px;color:#ccc;text-align:center">Select a client above</div>';
  h += '</div></div>';
  return h;
}

function loadClientMsgList(){
  var cid = document.getElementById('msg-client-sel').value;
  var list = document.getElementById('msg-list');
  if (!cid) { list.innerHTML = '<p style="color:#ccc;text-align:center;padding:20px">Select a client above</p>'; return; }
  list.innerHTML = '<div style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin" style="font-size:20px;color:#ccc"></i></div>';
  api('get_messages', {client_id:cid}).then(function(msgs){
    var h = '';
    if (msgs.length === 0) {
      h = '<p style="color:#ccc;text-align:center;padding:20px">No messages yet. <button class="btn btn-primary btn-sm" onclick="openSendMsg()"><i class="fas fa-paper-plane"></i> Send one</button></p>';
    } else {
      msgs.forEach(function(m){
        var sender = m.sender === 'admin' ? '<span style="color:#27ae60">You</span>' : '<span style="color:#1E3A5F">Client</span>';
        h += '<div style="padding:10px 20px;border-bottom:1px solid #f0f0f0">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
          '<strong>' + sender + '</strong>' +
          '<small class="text-muted">' + new Date(m.created_at).toLocaleString('en-US') + '</small></div>' +
          '<div style="font-size:13px;color:#555;margin-bottom:4px"><strong>' + esc(m.subject) + '</strong></div>' +
          '<div style="font-size:13px;color:#666">' + esc(m.message) + '</div></div>';
      });
      h += '<div style="padding:16px 20px"><button class="btn btn-primary" onclick="openSendMsg()"><i class="fas fa-paper-plane"></i> Send Message</button></div>';
    }
    list.innerHTML = h;
    list.setAttribute('data-client-id', cid);
  });
}

function openSendMsg(){
  var cid = document.getElementById('msg-client-sel').value;
  if (!cid) { alert('Select a client first'); return; }
  document.getElementById('mo-sendmsg-tt').textContent = 'Send Message';
  document.getElementById('mo-sendmsg-bd').innerHTML =
    '<form id="sendmsgf">' +
    '<input type="hidden" name="client_id" value="' + cid + '">' +
    '<div class="form-group"><label>Subject *</label><input class="form-control" name="subject" required placeholder="Message subject"></div>' +
    '<div class="form-group"><label>Message *</label><textarea class="form-control" name="message" rows="5" required placeholder="Your message..."></textarea></div>' +
    '</form>';
  openModal('mo-sendmsg');
}

function sendMessage(){
  var fd = new FormData(document.getElementById('sendmsgf'));
  api('send_message', fd, 'POST').then(function(d){
    if (d.success) {
      closeModal('mo-sendmsg');
      toast('Message sent!');
      loadClientMsgList();
    } else {
      toast('Error sending','error');
    }
  });
}

// ── BOOT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  showPage('q');
});
</script>

</body>
</html>
