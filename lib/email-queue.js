function nextEmailAttemptAt(attempts, now = new Date()) {
  const minutes = Math.min(60, 2 ** Math.max(0, Number(attempts) - 1));
  return new Date(now.getTime() + minutes * 60 * 1000);
}

async function enqueueEmail(pool, { to, subject, html, text = '', attachments = [] }) {
  const [result] = await pool.execute(
    'INSERT INTO outbound_emails (to_email, subject, html_content, text_content, attachments_json) VALUES (?,?,?,?,?)',
    [to, subject, html, text, JSON.stringify(attachments)]
  );
  return result.insertId;
}

async function processNextEmail(pool, deliver, now = new Date()) {
  const [rows] = await pool.execute(
    `SELECT id, to_email, subject, html_content, text_content, attachments_json, attempts
     FROM outbound_emails
     WHERE (status='pending' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW()))
        OR (status='processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))
     ORDER BY id ASC LIMIT 1`
  );
  const email = rows[0];
  if (!email) return false;

  const [claimed] = await pool.execute(
    `UPDATE outbound_emails SET status='processing', attempts=attempts+1, updated_at=NOW()
     WHERE id=? AND (status='pending' OR (status='processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)))`,
    [email.id]
  );
  if (!claimed.affectedRows) return false;

  try {
    const attachments = JSON.parse(email.attachments_json || '[]');
    const delivered = await deliver({ to: email.to_email, subject: email.subject, html: email.html_content, text: email.text_content, attachments });
    if (!delivered) throw new Error('SMTP_SEND_FAILED');
    await pool.execute("UPDATE outbound_emails SET status='sent', sent_at=NOW(), last_error=NULL WHERE id=?", [email.id]);
  } catch (error) {
    const attempts = Number(email.attempts) + 1;
    const failedPermanently = attempts >= 5;
    await pool.execute(
      "UPDATE outbound_emails SET status=?, last_error=?, next_attempt_at=? WHERE id=?",
      [failedPermanently ? 'failed' : 'pending', String(error.message || 'SMTP_SEND_FAILED').slice(0, 500), failedPermanently ? null : nextEmailAttemptAt(attempts, now), email.id]
    );
  }
  return true;
}

module.exports = { enqueueEmail, nextEmailAttemptAt, processNextEmail };
