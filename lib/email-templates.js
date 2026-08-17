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
  return 'If you do not see this email within a few minutes, please check your spam or junk folder and add info@petflyinc.com to your contacts.';
}

function layout({ siteUrl, title, greeting, body, cta, deliveryNote = true }) {
  const normalizedSiteUrl = String(siteUrl || '').replace(/\/+$/, '');
  const logoUrl = `${normalizedSiteUrl}/images/petfly-email-logo.png`;
  const escapedSiteUrl = escapeHtml(normalizedSiteUrl);
  const escapedTitle = escapeHtml(title);
  const escapedGreeting = escapeHtml(greeting);
  const escapedBody = escapeHtml(body).replace(/\n/g, '<br>');
  const ctaHtml = cta
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(cta.url)}" style="background:${COLORS.terracotta};color:#ffffff;display:inline-block;padding:12px 20px;text-decoration:none;">${escapeHtml(cta.label)}</a></p><p style="margin:0;font-size:14px;line-height:1.5;word-break:break-word;">${escapeHtml(cta.url)}</p>`
    : '';
  const notice = deliveryNote ? deliveryNotice() : '';
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${COLORS.cream};color:${COLORS.charcoal};font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;"><tr><td style="padding:28px 32px;background:${COLORS.charcoal};color:#ffffff;"><img src="${escapeHtml(logoUrl)}" alt="Pet Fly Inc" width="160" style="display:block;max-width:160px;height:auto;"><p style="margin:12px 0 0;font-size:16px;">Pet Fly Inc</p></td></tr><tr><td style="padding:32px;"><h1 style="margin:0 0 20px;color:${COLORS.charcoal};font-size:24px;font-weight:normal;">${escapedTitle}</h1><p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapedGreeting}</p><p style="margin:0;font-size:16px;line-height:1.5;">${escapedBody}</p>${ctaHtml}</td></tr><tr><td style="padding:24px 32px;background:${COLORS.cream};font-size:14px;line-height:1.5;"><p style="margin:0 0 12px;">${escapeHtml(notice)}</p><p style="margin:0;">Pet Fly Inc: <a href="mailto:info@petflyinc.com" style="color:${COLORS.terracotta};">info@petflyinc.com</a></p><p style="margin:8px 0 0;"><a href="${escapedSiteUrl}" style="color:${COLORS.terracotta};">${escapedSiteUrl}</a></p></td></tr></table></td></tr></table></body></html>`;
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
    'Pet Fly Inc: info@petflyinc.com',
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

function contactConfirmation({ name, siteUrl }) { return { subject: 'We received your Pet Fly Inc message', ...layout({ siteUrl, title: 'Your message is received', greeting: `Hello ${name},`, body: 'Thank you for contacting Pet Fly Inc. Our team will get back to you shortly.' }) }; }
function contractSigned({ contractNumber, siteUrl }) { return { subject: `Your signed Pet Fly contract ${contractNumber}`, ...layout({ siteUrl, title: 'Your signed contract is ready', greeting: 'Thank you for choosing Pet Fly Inc.', body: `Contract number: ${contractNumber}\nYour signed contract is attached as a PDF for your records.` }) }; }
function finderMessage({ petName, finderName, finderEmail, finderPhone, message, siteUrl }) { return { subject: `PetConnect message about ${petName}`, ...layout({ siteUrl, title: `A message about ${petName}`, greeting: 'A PetConnect finder contacted you.', body: `Finder: ${finderName}\nEmail: ${finderEmail}\nPhone: ${finderPhone || 'Not provided'}\n\nMessage:\n${message}` }) }; }
function lostFoundAlert({ petName, alertType, location, alertUrl, siteUrl }) { return { subject: `[${String(alertType).toUpperCase()} PET] ${petName}`, ...layout({ siteUrl, title: `${alertType === 'found' ? 'Found' : 'Lost'} pet alert: ${petName}`, greeting: 'A PetConnect alert was posted near you.', body: `Location: ${location}`, cta: { label: 'View alert details', url: alertUrl } }) }; }
function partnerVerification({ claimUrl, siteUrl }) { return { subject: 'Verify your PetConnect partner profile', ...layout({ siteUrl, title: 'Verify your partner profile', greeting: 'Welcome to PetConnect.', body: 'Verify and claim your organization profile to complete registration.', cta: { label: 'Verify and claim profile', url: claimUrl } }) }; }
function partnerInvitation({ organizationName, claimUrl, siteUrl }) {
  return {
    subject: 'Help reunite lost pets in your community with PetConnect',
    ...layout({
      siteUrl,
      title: 'You are invited to PetConnect',
      greeting: `Hello ${organizationName},`,
      body: 'Pet Fly Inc is inviting your organization to join PetConnect, a free community network built to help reunite lost pets with their families.\n\nThere are no platform fees or subscription charges to join.\n\nAs a verified partner, you can receive notifications for nearby missing-pet alerts, view the pet details that can help your team respond, and post a found-pet alert when a pet is brought to your facility. Your participation gives local families another trusted place to turn when a pet is missing.\n\nPetConnect is designed for practical community support: a free service, privacy-conscious owner contact, and local notifications that help veterinary hospitals, shelters, rescues, and pet-care organizations coordinate quickly.\n\nCreate your partner account to choose your alert preferences and become part of the local safety network.',
      cta: { label: 'Join PetConnect for free', url: claimUrl }
    })
  };
}
function portalAccess({ loginUrl, initialPassword, siteUrl }) { return { subject: 'Your Pet Fly relocation portal access', ...layout({ siteUrl, title: 'Your relocation portal is ready', greeting: 'Welcome to your Pet Fly client portal.', body: `Temporary password: ${initialPassword}\nYou will be asked to create a new password after signing in.`, cta: { label: 'Sign in to the client portal', url: loginUrl } }) }; }
function internalQuoteNotification({ name, email, details, siteUrl }) { return { subject: `New Quote Request from ${name}`, ...layout({ siteUrl, title: 'New quote request', greeting: `${name} submitted a quote request.`, body: [`Email: ${email}`].concat((details || []).map(([label, value]) => `${label}: ${value}`)).join('\n'), deliveryNote: false }) }; }
function internalContactNotification({ name, email, subject, message, siteUrl }) { return { subject: `Contact Form: ${subject || name}`, ...layout({ siteUrl, title: 'New contact message', greeting: `${name} sent a message.`, body: `Email: ${email}\nSubject: ${subject || '(no subject)'}\n\n${message}`, deliveryNote: false }) }; }
function smtpTest({ siteUrl }) { return { subject: 'Pet Fly Inc email delivery test', ...layout({ siteUrl, title: 'Email delivery test', greeting: 'SMTP delivery is working.', body: 'This is a Pet Fly Inc email delivery test.', deliveryNote: false }) }; }

module.exports = {
  escapeHtml,
  deliveryNotice,
  layout,
  quoteConfirmation,
  memberVerification,
  contactConfirmation,
  contractSigned,
  finderMessage,
  lostFoundAlert,
  partnerVerification,
  partnerInvitation,
  portalAccess,
  internalQuoteNotification,
  internalContactNotification,
  smtpTest
};
