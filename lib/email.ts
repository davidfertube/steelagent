/**
 * Email Service (Resend)
 * Handles transactional emails for SpecVault
 */

import { Resend } from 'resend';

const FROM_EMAIL = 'SpecVault <noreply@specvault.app>';

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendWelcomeEmail(email: string, name?: string) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to SpecVault',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a2e;">Welcome to SpecVault${name ? `, ${name}` : ''}</h1>
          <p style="color: #555; line-height: 1.6;">
            Thank you for signing up. SpecVault helps you search steel specifications (ASTM, API, NACE)
            with AI-powered precision and traceable citations.
          </p>
          <h3 style="color: #1a1a2e;">Get Started:</h3>
          <ol style="color: #555; line-height: 1.8;">
            <li>Upload your first PDF specification</li>
            <li>Ask a technical question</li>
            <li>Get a cited answer with confidence scoring</li>
          </ol>
          <a href="https://specvault.app/dashboard" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Go to Dashboard
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            SpecVault - AI-powered steel specification search<br/>
            <em>AI-generated responses are for reference only. Always verify against original specifications.</em>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] Failed to send welcome email:', err);
  }
}

export async function sendPaymentFailedEmail(email: string) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Payment Failed - SpecVault',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Payment Failed</h1>
          <p style="color: #555; line-height: 1.6;">
            We were unable to process your payment for SpecVault. Please update your payment method
            to continue using your subscription.
          </p>
          <a href="https://specvault.app/account" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Update Payment Method
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            If you believe this is an error, contact <a href="mailto:support@specvault.app">support@specvault.app</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] Failed to send payment failed email:', err);
  }
}

export async function sendSubscriptionConfirmation(email: string, plan: string) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Subscription Confirmed - SpecVault ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Subscription Confirmed</h1>
          <p style="color: #555; line-height: 1.6;">
            Your <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan is now active.
            Thank you for choosing SpecVault.
          </p>
          <a href="https://specvault.app/dashboard" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Go to Dashboard
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Manage your subscription anytime at <a href="https://specvault.app/account">Account Settings</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] Failed to send subscription confirmation:', err);
  }
}

export async function sendAccountDeletionConfirmation(email: string) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Account Deleted - SpecVault',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a2e;">Account Deleted</h1>
          <p style="color: #555; line-height: 1.6;">
            Your SpecVault account and all associated data have been permanently deleted.
            If you did not request this, please contact us immediately.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            Contact: <a href="mailto:support@specvault.app">support@specvault.app</a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Email] Failed to send account deletion confirmation:', err);
  }
}
