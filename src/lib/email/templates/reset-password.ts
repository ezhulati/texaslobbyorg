import { getBaseEmailTemplate } from './base';

export interface ResetPasswordData {
  email: string;
  resetLink: string;
}

export function getResetPasswordTemplate(data: ResetPasswordData): { subject: string; html: string } {
  const content = `
    <h1>Reset Your Password</h1>

    <p>We received a request to reset the password for your TexasLobby.org account associated with <strong>${data.email}</strong>.</p>

    <p>Click the button below to create a new password. This link will expire in 1 hour for your security.</p>

    <div style="text-align: center;">
      <a href="${data.resetLink}" class="button">Reset Password</a>
    </div>

    <div class="help-text">
      <p><strong>Security measures:</strong></p>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>This link can only be used once</li>
        <li>The link expires after 1 hour</li>
        <li>Your old password will remain active until you set a new one</li>
      </ul>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; color: #888; word-break: break-all;">${data.resetLink}</p>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;"><strong>Didn't request a password reset?</strong></p>
    <p style="font-size: 14px; color: #666;">If you didn't make this request, your account may be at risk. Please contact our support team immediately at <a href="mailto:support@texaslobby.org">support@texaslobby.org</a>.</p>
  `;

  return {
    subject: 'Reset Your TexasLobby.org Password',
    html: getBaseEmailTemplate(content),
  };
}
