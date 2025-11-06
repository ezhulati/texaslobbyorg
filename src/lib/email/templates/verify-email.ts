import { getBaseEmailTemplate } from './base';

export interface VerifyEmailData {
  email: string;
  confirmationUrl: string;
}

export function getVerifyEmailTemplate(data: VerifyEmailData): { subject: string; html: string } {
  const content = `
    <h1>Welcome to TexasLobby.org!</h1>

    <p>Thank you for creating an account with TexasLobby.org, the premier directory for finding experienced Texas lobbyists.</p>

    <p>To get started and access all features, please verify your email address by clicking the button below:</p>

    <div style="text-align: center;">
      <a href="${data.confirmationUrl}" class="button">Verify Email Address</a>
    </div>

    <div class="help-text">
      <p><strong>Why verify your email?</strong></p>
      <p>Email verification helps us ensure the security of your account and allows you to:</p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Receive important updates about your account</li>
        <li>Reset your password if needed</li>
        <li>Access exclusive features and notifications</li>
      </ul>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; color: #888; word-break: break-all;">${data.confirmationUrl}</p>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">If you didn't create an account with TexasLobby.org, you can safely ignore this email.</p>
  `;

  return {
    subject: 'Welcome to TexasLobby.org - Verify Your Email',
    html: getBaseEmailTemplate(content),
  };
}
