import { getBaseEmailTemplate } from './base';

export interface MagicLinkData {
  email: string;
  magicLink: string;
}

export function getMagicLinkTemplate(data: MagicLinkData): { subject: string; html: string } {
  const content = `
    <h1>Your Sign-In Link</h1>

    <p>You requested a magic link to sign in to your TexasLobby.org account.</p>

    <p>Click the button below to securely sign in to your account. This link will expire in 1 hour for your security.</p>

    <div style="text-align: center;">
      <a href="${data.magicLink}" class="button">Sign In to TexasLobby.org</a>
    </div>

    <div class="help-text">
      <p><strong>Security tip:</strong> This link can only be used once and will expire after 1 hour. Never share this link with anyone.</p>
    </div>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; color: #888; word-break: break-all;">${data.magicLink}</p>

    <div class="divider"></div>

    <p style="font-size: 14px; color: #666;">If you didn't request this sign-in link, you can safely ignore this email. Your account remains secure.</p>
  `;

  return {
    subject: 'Sign In to TexasLobby.org',
    html: getBaseEmailTemplate(content),
  };
}
