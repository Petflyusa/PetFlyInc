const COLORS = {
  cream: '#f7f5f0',
  charcoal: '#1a1a1a',
  terracotta: '#c4622d'
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deliveryNotice() {
  return 'Please check your spam or junk folder if you do not see our reply.';
}

function layout({ siteUrl, title, greeting, body, cta, deliveryNote = true }) {
  const normalizedSiteUrl = String(siteUrl || '').replace(/\/+$/, '');
  const logoUrl = `${normalizedSiteUrl}/images/petfly-email-logo.png`;
  const escapedSiteUrl = escapeHtml(normalizedSiteUrl);
  const escapedTitle = escapeHtml(title);
  const escapedGreeting = escapeHtml(greeting);
  const escapedBody = escapeHtml(body);
  const ctaHtml = cta
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(cta.url)}" style="background:${COLORS.terracotta};color:#ffffff;display:inline-block;padding:12px 20px;text-decoration:none;">${escapeHtml(cta.label)}</a></p><p style="margin:0;font-size:14px;line-height:1.5;word-break:break-word;">${escapeHtml(cta.url)}</p>`
    : '';
  const notice = deliveryNote ? deliveryNotice() : '';
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${COLORS.cream};color:${COLORS.charcoal};font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;"><tr><td style="padding:28px 32px;background:${COLORS.charcoal};color:#ffffff;"><img src="${escapeHtml(logoUrl)}" alt="Pet Fly Inc" width="160" style="display:block;max-width:160px;height:auto;"><p style="margin:12px 0 0;font-size:16px;">Pet Fly Inc</p></td></tr><tr><td style="padding:32px;"><h1 style="margin:0 0 20px;color:${COLORS.charcoal};font-size:24px;font-weight:normal;">${escapedTitle}</h1><p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapedGreeting}</p><p style="margin:0;font-size:16px;line-height:1.5;">${escapedBody}</p>${ctaHtml}</td></tr><tr><td style="padding:24px 32px;background:${COLORS.cream};font-size:14px;line-height:1.5;"><p style="margin:0 0 12px;">${escapeHtml(notice)}</p><p style="margin:0;">Pet Fly Inc Support: <a href="mailto:support@petflyinc.com" style="color:${COLORS.terracotta};">support@petflyinc.com</a></p><p style="margin:8px 0 0;"><a href="${escapedSiteUrl}" style="color:${COLORS.terracotta};">${escapedSiteUrl}</a></p></td></tr></table></td></tr></table></body></html>`;
  const text = [
    'Pet Fly Inc',
    '',
    title,
    '',
    greeting,
    body,
    cta ? `${cta.label}: ${cta.url}` : '',
    notice,
    '',
    'Pet Fly Inc Support: support@petflyinc.com',
    normalizedSiteUrl
  ].filter(Boolean).join('\n');

  return { html, text };
}

function quoteConfirmation({ name, siteUrl }) {
  const content = layout({
    siteUrl,
    title: 'Your quote request is in',
    greeting: `Hello ${name},`,
    body: 'Thank you for contacting Pet Fly Inc. Our team will review your pet transportation needs and reply soon.'
  });

  return {
    subject: 'We received your Pet Fly Inc quote request',
    ...content
  };
}

function memberVerification({ name, siteUrl, verifyUrl }) {
  const content = layout({
    siteUrl,
    title: 'Verify your Pet Fly Inc account',
    greeting: `Hello ${name},`,
    body: 'Please verify your email address to finish setting up your Pet Fly Inc member account.',
    cta: {
      label: 'Verify your email',
      url: verifyUrl
    }
  });

  return {
    subject: 'Verify your Pet Fly Inc account',
    ...content
  };
}

module.exports = {
  escapeHtml,
  deliveryNotice,
  layout,
  quoteConfirmation,
  memberVerification
};
