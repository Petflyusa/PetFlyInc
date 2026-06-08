<?php
// Simple but effective anti-spam CAPTCHA
// Uses time-based validation and honeypot fields

function generateCaptcha() {
    $num1 = rand(1, 9);
    $num2 = rand(1, 9);
    $result = $num1 + $num2;
    $_SESSION['captcha_result'] = $result;
    $_SESSION['captcha_time'] = time();
    return ['num1' => $num1, 'num2' => $num2];
}

function verifyCaptcha($answer) {
    if (!isset($_SESSION['captcha_result']) || !isset($_SESSION['captcha_time'])) {
        return false;
    }
    
    // Check if enough time has passed (3 seconds - bots are too fast)
    if (time() - $_SESSION['captcha_time'] < 3) {
        return false; // Too fast, likely a bot
    }
    
    // Check answer
    $answer = intval($answer);
    if ($answer == $_SESSION['captcha_result']) {
        unset($_SESSION['captcha_result']);
        unset($_SESSION['captcha_time']);
        return true;
    }
    
    return false;
}

function renderCaptcha() {
    $captcha = generateCaptcha();
    return '
    <div class="form-group">
        <label>Security Check <span class="required">*</span></label>
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="background: #f0f4f8; padding: 10px 15px; border-radius: 8px; font-weight: 600; font-size: 18px;">' . $captcha['num1'] . ' + ' . $captcha['num2'] . ' = ?</span>
            <input type="number" class="form-control" name="captcha_answer" placeholder="Answer" required style="max-width: 100px;">
        </div>
        <small style="color: #999;">Please solve this simple math problem to verify you are human</small>
    </div>
    ';
}

// Honeypot field (hidden from humans, visible to bots)
function renderHoneypot() {
    return '<input type="text" name="website_url" style="position: absolute; left: -9999px;" tabindex="-1" autocomplete="off">';
}

function verifyHoneypot() {
    return empty($_POST['website_url']);
}
?>