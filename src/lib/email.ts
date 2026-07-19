// src/lib/email.ts
// Resend email integration

import { Resend } from 'resend';
import { generateVerificationPair, generateActionPair } from './tokens';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@rentinhyderabad.in';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rentinhyderabad.in';

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

// ============================================
// Email Templates
// ============================================

function getEmailWrapper(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hyderabad.rent</title>
</head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F5F5F0;">
  <div style="display:none;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr>
      <td style="background:#141414;border:1px solid #2E2E2E;border-radius:12px;padding:32px;">
        ${content}
      </td>
    </tr>
    <tr>
      <td style="text-align:center;padding:24px 0 0;">
        <p style="margin:0;font-size:12px;color:#888880;">
          You received this email because you signed up on hyderabad.rent.<br>
          <a href="${APP_URL}/unsubscribe" style="color:#E8A838;text-decoration:underline;">Unsubscribe</a> |
          <a href="${APP_URL}/privacy" style="color:#E8A838;text-decoration:underline;">Privacy</a>
        </p>
      </td>
    </tr>
  </table>
</body></html>`;
}

function getButton(url: string, text: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const bg = variant === 'primary' ? '#E8A838' : '#2E2E2E';
  const color = variant === 'primary' ? '#0D0D0D' : '#F5F5F0';
  return `<a href="${url}" style="display:inline-block;background:${bg};color:${color};padding:14px 28px;border-radius:8px;font-weight:600;text-decoration:none;font-size:16px;line-height:1;">${text}</a>`;
}

// ============================================
// Verification Emails
// ============================================

export async function sendIdentityVerificationEmail(
  email: string,
  token: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const verifyUrl = `${APP_URL}/verify?token=${token}&type=identity`;

  const html = getEmailWrapper(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#F5F5F0;">Verify your email</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#B8B8B0;">
      Welcome to hyderabad.rent. Please verify your email address to start using the platform.
    </p>
    ${getButton(verifyUrl, 'Verify Email Address')}
    <p style="margin:24px 0 0;font-size:14px;color:#888880;">
      This link expires in 24 hours. If you didn't create an account, you can ignore this email.
    </p>
  `, 'Verify your email to access hyderabad.rent');

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your email - hyderabad.rent',
      html,
    });
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function sendListingVerificationEmail(
  email: string,
  token: string,
  listingId: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const verifyUrl = `${APP_URL}/verify?token=${token}&type=listing&id=${listingId}`;

  const html = getEmailWrapper(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#F5F5F0;">Verify your listing</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#B8B8B0;">
      Thanks for submitting your listing. Please verify your email to publish it.
    </p>
    ${getButton(verifyUrl, 'Verify & Publish Listing')}
    <p style="margin:24px 0 0;font-size:14px;color:#888880;">
      This link expires in 24 hours. Your listing will remain in pending status until verified.
    </p>
  `, 'Verify your email to publish your listing');

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your listing - hyderabad.rent',
      html,
    });
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function sendSeekerVerificationEmail(
  email: string,
  token: string,
  seekerId: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const verifyUrl = `${APP_URL}/verify?token=${token}&type=seeker&id=${seekerId}`;

  const html = getEmailWrapper(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#F5F5F0;">Verify your search</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#B8B8B0;">
      Thanks for submitting your requirements. Please verify your email to activate your search.
    </p>
    ${getButton(verifyUrl, 'Verify & Activate Search')}
    <p style="margin:24px 0 0;font-size:14px;color:#888880;">
      This link expires in 24 hours. Your search will remain in pending status until verified.
    </p>
  `, 'Verify your email to activate your search');

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify your search - hyderabad.rent',
      html,
    });
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// Match & Introduction Emails
// ============================================

export async function sendMatchDigestEmail(
  email: string,
  matches: Array<{
    matchId: string;
    listing: {
      id: string;
      title: string;
      locality: string;
      rent: number;
      bhk: string;
      listingType: string;
    };
    score: number;
    seekerProfile: {
      budgetRange: string;
      bhk: string;
      moveInWindow: string;
      lifestyleTags: string[];
    };
  }>,
  unsubscribeToken: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const matchItemsHtml = matches.map(m => `
    <tr>
      <td style="padding:20px 0;border-bottom:1px solid #2E2E2E;">
        <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#F5F5F0;">${escapeHtml(m.listing.title)}</h3>
        <p style="margin:0 0 4px;font-size:14px;color:#B8B8B0;">${escapeHtml(m.listing.locality)} • ${escapeHtml(m.listing.bhk)} • ${m.listing.listingType === 'whole_flat' ? 'Whole Flat' : 'Room/Flatmate'}</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#E8A838;">${formatINR(m.listing.rent)}/month</p>
        <p style="margin:0 0 12px;font-size:13px;color:#888880;">Match score: ${m.score}% • Seeker: ${escapeHtml(m.seekerProfile.budgetRange)} • ${escapeHtml(m.seekerProfile.moveInWindow)}</p>
        <a href="${APP_URL}/matches/${m.matchId}?token=${unsubscribeToken}" style="color:#E8A838;text-decoration:none;font-weight:500;">View & Respond →</a>
      </td>
    </tr>
  `).join('');

  const html = getEmailWrapper(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#F5F5F0;">Your daily matches</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#B8B8B0;">
      You have ${matches.length} new match${matches.length !== 1 ? 'es' : ''}. Review and respond within 7 days.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${matchItemsHtml}
    </table>
    <p style="margin:24px 0 0;font-size:14px;color:#888880;">
      <a href="${APP_URL}/unsubscribe?token=${unsubscribeToken}" style="color:#E8A838;text-decoration:underline;">Unsubscribe from daily digests</a>
    </p>
  `, `${matches.length} new match${matches.length !== 1 ? 'es' : ''} on hyderabad.rent`);

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${matches.length} new match${matches.length !== 1 ? 'es' : ''} on hyderabad.rent`,
      html,
    });
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function sendIntroductionEmail(
  email: string,
  contactInfo: {
    name: string;
    phone?: string;
    email?: string;
    preferredMethod: string;
    contactWindow?: string;
  },
  matchContext: {
    listingTitle: string;
    locality: string;
  },
  withdrawalToken: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const withdrawalUrl = `${APP_URL}/withdraw?token=${withdrawalToken}`;

  const contactHtml = `
    <p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#F5F5F0;"><strong>Contact:</strong> ${escapeHtml(contactInfo.name)}</p>
    ${contactInfo.phone ? `<p style="margin:0 0 4px;font-size:15px;color:#B8B8B0;">📞 ${escapeHtml(contactInfo.phone)}</p>` : ''}
    ${contactInfo.email ? `<p style="margin:0 0 4px;font-size:15px;color:#B8B8B0;">✉️ ${escapeHtml(contactInfo.email)}</p>` : ''}
    <p style="margin:8px 0 0;font-size:13px;color:#888880;">Preferred: ${escapeHtml(contactInfo.preferredMethod)}${contactInfo.contactWindow ? ` (${escapeHtml(contactInfo.contactWindow)})` : ''}</p>
  `;

  const html = getEmailWrapper(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#F5F5F0;">Introduction: ${escapeHtml(matchContext.listingTitle)}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#B8B8B0;">
      Both parties have accepted the match. Here are the contact details:
    </p>
    <div style="background:#1A1A1A;border:1px solid #2E2E2E;border-radius:8px;padding:20px;margin-bottom:24px;">
      ${contactHtml}
    </div>
    <p style="margin:0 0 16px;font-size:14px;color:#888880;">
      <strong>⚠️ Safety reminder:</strong> Never pay before visiting and independently verifying the property.
      Meet in a public place first. Report any suspicious activity using the report button on the platform.
    </p>
    <p style="margin:24px 0 0;font-size:14px;color:#888880;">
      <a href="${withdrawalUrl}" style="color:#EF5350;text-decoration:underline;">Withdraw from this introduction</a>
    </p>
  `, `You're connected: ${escapeHtml(matchContext.listingTitle)} in ${escapeHtml(matchContext.locality)}`);

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `You're connected: ${matchContext.listingTitle}`,
      html,
    });
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// Notification Emails
// ============================================

export async function sendListingApprovedEmail(
  email: string,
  listingTitle: string,
  listingUrl: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const html = getEmailWrapper(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#4CAF50;">Listing approved</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#B8B8B0;">
      Your listing <strong>"${escapeHtml(listingTitle)}"</strong> has been approved and is now visible to seekers.
    </p>
    ${getButton(listingUrl, 'View Listing')}
  `, `Your listing "${escapeHtml(listingTitle)}" is live`);

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Listing approved: ${listingTitle}`,
      html,
    });
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function sendListingRentedEmail(
  email: string,
  listingTitle: string
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const html = getEmailWrapper(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#F5F5F0;">Listing marked as rented</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#B8B8B0;">
      Your listing <strong>"${escapeHtml(listingTitle)}"</strong> has been marked as rented and is no longer visible to seekers.
    </p>
    <p style="margin:0;font-size:14px;color:#888880;">
      You can relist it anytime from your dashboard.
    </p>
  `, `Your listing "${escapeHtml(listingTitle)}" is now rented`);

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Listing rented: ${listingTitle}`,
      html,
    });
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// Daily Digest Email
// ============================================

export async function sendDailyDigestEmail(
  email: string,
  matches: Array<{
    matchId: string;
    listing: {
      id: string;
      listingType: string;
      title: string;
      description?: string;
      bhk: string;
      furnishing: string;
      rent: number;
      depositMonths: number;
      maintenanceIncluded: boolean;
      locality: string;
      geom?: { type: string; coordinates: [number, number] };
      availableFrom: string;
      availableUntil?: string | null;
      amenities: string[];
      lifestylePrefs: Record<string, unknown>;
      createdAt: string;
      viewCount: number;
    };
    score: number;
    scoreBreakdown: { geography: number; budget: number; bhk: number; timing: number; lifestyle: number };
    seekerProfile: {
      budgetRange: string;
      bhk: string;
      moveInWindow: string;
      lifestyleTags: string[];
    };
  }>
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const matchItemsHtml = matches.map(m => `
    <tr>
      <td style="padding:20px 0;border-bottom:1px solid #2E2E2E;">
        <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#F5F5F0;">${escapeHtml(m.listing.title)}</h3>
        <p style="margin:0 0 4px;font-size:14px;color:#B8B8B0;">${escapeHtml(m.listing.locality)} • ${escapeHtml(m.listing.bhk)} ${escapeHtml(m.listing.furnishing.replace('_', ' '))} • ${m.listing.listingType === 'whole_flat' ? 'Whole Flat' : 'Room/Flatmate'}</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#E8A838;">${formatINR(m.listing.rent)}/month</p>
        <p style="margin:0 0 12px;font-size:13px;color:#888880;">Match score: ${m.score}% • Geography: ${m.scoreBreakdown.geography}% • Budget: ${m.scoreBreakdown.budget}% • BHK: ${m.scoreBreakdown.bhk}% • Timing: ${m.scoreBreakdown.timing}% • Lifestyle: ${m.scoreBreakdown.lifestyle}%</p>
        <a href="${APP_URL}/matches/${m.matchId}" style="color:#E8A838;text-decoration:none;font-weight:500;">View & Respond →</a>
      </td>
    </tr>
  `).join('');

  const html = getEmailWrapper(`
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#F5F5F0;">Your daily matches</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#B8B8B0;">
      You have ${matches.length} new match${matches.length !== 1 ? 'es' : ''} today. Review and respond within 7 days.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${matchItemsHtml}
    </table>
    <p style="margin:24px 0 0;font-size:14px;color:#888880;">
      <a href="${APP_URL}/seekers" style="color:#E8A838;text-decoration:underline;">Manage your search preferences</a>
    </p>
  `, `${matches.length} new match${matches.length !== 1 ? 'es' : ''} on hyderabad.rent`);

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${matches.length} new match${matches.length !== 1 ? 'es' : ''} on hyderabad.rent`,
      html,
    });
    return { success: true, emailId: result.data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================
// Helper (re-export from utils for email template)
// ============================================

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}