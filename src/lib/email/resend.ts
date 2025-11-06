import { Resend } from 'resend';
import {
  getVerifyEmailTemplate,
  getMagicLinkTemplate,
  getResetPasswordTemplate,
  type VerifyEmailData,
  type MagicLinkData,
  type ResetPasswordData,
} from './templates';

// Initialize Resend with API key from environment
const resend = new Resend(import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY);

const FROM_EMAIL = 'TexasLobby.org <noreply@texaslobby.org>';
const REPLY_TO_EMAIL = 'support@texaslobby.org';

export interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(data: VerifyEmailData): Promise<EmailResult> {
  try {
    const template = getVerifyEmailTemplate(data);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: template.subject,
      html: template.html,
      replyTo: REPLY_TO_EMAIL,
    });

    if (result.error) {
      console.error('Error sending verification email:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Send magic link email for passwordless login
 */
export async function sendMagicLinkEmail(data: MagicLinkData): Promise<EmailResult> {
  try {
    const template = getMagicLinkTemplate(data);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: template.subject,
      html: template.html,
      replyTo: REPLY_TO_EMAIL,
    });

    if (result.error) {
      console.error('Error sending magic link email:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending magic link email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: ResetPasswordData): Promise<EmailResult> {
  try {
    const template = getResetPasswordTemplate(data);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: template.subject,
      html: template.html,
      replyTo: REPLY_TO_EMAIL,
    });

    if (result.error) {
      console.error('Error sending password reset email:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Send a generic email
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  try {
    const result = await resend.emails.send({
      from: params.from || FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo || REPLY_TO_EMAIL,
    });

    if (result.error) {
      console.error('Error sending email:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
