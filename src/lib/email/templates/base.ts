/**
 * Base email template with TexasLobby.org branding
 */
export function getBaseEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TexasLobby.org</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #003DA5 0%, #002D7A 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      display: inline-block;
      padding: 15px 30px;
      background-color: white;
      border-radius: 8px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: bold;
      color: #003DA5;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .logo-star {
      color: #BF0A30;
      font-size: 20px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h1 {
      color: #003DA5;
      font-size: 24px;
      margin: 0 0 20px 0;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #555555;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #003DA5;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #002D7A;
    }
    .divider {
      border-top: 1px solid #e5e5e5;
      margin: 30px 0;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #f9f9f9;
      border-top: 1px solid #e5e5e5;
    }
    .footer p {
      margin: 8px 0;
      color: #888888;
      font-size: 14px;
    }
    .footer a {
      color: #003DA5;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .help-text {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #003DA5;
    }
    .help-text p {
      margin: 0;
      font-size: 14px;
      color: #666666;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <p class="logo-text">
          <span class="logo-star">★</span>
          <span>TEXAS<strong>LOBBY</strong></span>
          <span style="font-size: 14px; color: #666;">.org</span>
        </p>
      </div>
    </div>

    <div class="content">
      ${content}
    </div>

    <div class="footer">
      <p><strong>TexasLobby.org</strong></p>
      <p>Find Your Voice in Texas Politics</p>
      <p style="margin-top: 15px;">
        <a href="https://texaslobby.org">Visit Website</a> •
        <a href="https://texaslobby.org/contact">Contact Us</a> •
        <a href="https://texaslobby.org/privacy">Privacy Policy</a>
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        © ${new Date().getFullYear()} TexasLobby.org. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
