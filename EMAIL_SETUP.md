# Cherishly Email Template Setup

To complete the authentication modernization, you need to customize the email templates in your backend to match Cherishly's brand.

## Steps to Configure Email Templates

1. **Open the Backend Dashboard**
   - Click the "View Backend" button in Lovable to access your backend
   - Navigate to Authentication → Email Templates

2. **Customize the Confirmation Email Template**

Use this template for email verification:

**Subject:** Verify your Cherishly account 💕

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #4a2c35;
      background-color: #fef5f7;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(212, 64, 100, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #d44064, #a54d88);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      font-size: 32px;
      margin: 0;
      font-weight: 700;
    }
    .heart-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #d44064;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      color: #6b5157;
      font-size: 16px;
      margin: 16px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #d44064, #a54d88);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      background: #fef5f7;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #8b7278;
    }
    .footer a {
      color: #d44064;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="heart-icon">💕</div>
      <h1>CHERISHLY</h1>
    </div>
    <div class="content">
      <h2>Welcome to Cherishly!</h2>
      <p>We're excited to have you join us. To get started, please verify your email address by clicking the button below:</p>
      
      <a href="{{ .ConfirmationURL }}" class="button">Verify Email Address</a>
      
      <p>This link will expire in 24 hours for security reasons.</p>
      
      <p>If you didn't create a Cherishly account, you can safely ignore this email.</p>
      
      <p>Once verified, you'll be able to:</p>
      <ul>
        <li>Create profiles for your cherished connections</li>
        <li>Track important dates and events</li>
        <li>Get personalized activity suggestions</li>
        <li>Build meaningful moments together</li>
      </ul>
      
      <p style="margin-top: 30px;">Looking forward to helping you nurture your relationships,<br>
      <strong>The Cherishly Team</strong></p>
    </div>
    <div class="footer">
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
      <p style="margin-top: 20px;">
        Need help? <a href="mailto:support@cherishly.ai">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>
```

3. **Customize the Password Reset Email Template**

**Subject:** Reset your Cherishly password

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Same styles as above */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #4a2c35;
      background-color: #fef5f7;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(212, 64, 100, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #d44064, #a54d88);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      font-size: 32px;
      margin: 0;
      font-weight: 700;
    }
    .heart-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #d44064;
      font-size: 24px;
      margin-top: 0;
    }
    .content p {
      color: #6b5157;
      font-size: 16px;
      margin: 16px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #d44064, #a54d88);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .footer {
      background: #fef5f7;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #8b7278;
    }
    .footer a {
      color: #d44064;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="heart-icon">🔒</div>
      <h1>CHERISHLY</h1>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
      
      <p>This link will expire in 1 hour for security reasons.</p>
      
      <p><strong>If you didn't request a password reset, please ignore this email.</strong> Your password will remain unchanged.</p>
      
      <p style="margin-top: 30px;">Stay secure,<br>
      <strong>The Cherishly Team</strong></p>
    </div>
    <div class="footer">
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>
      <p style="margin-top: 20px;">
        Need help? <a href="mailto:support@cherishly.ai">Contact Support</a>
      </p>
    </div>
  </div>
</body>
</html>
```

## Important Settings

1. **Email Rate Limits**: Already configured to prevent spam
2. **Auto-confirm Email**: Now DISABLED - users must verify emails
3. **Test Users**: The following emails bypass verification:
   - fred@cherishly.ai
   - peter@cherishly.ai
   - alec@cherishly.ai

## Testing the Flow

1. Sign up with a new email
2. Check your inbox for the verification email
3. Click the verification link
4. Get redirected to the dashboard

## Troubleshooting

If users report not receiving emails:
- Check spam/junk folders
- Verify email domain is configured in backend
- Ensure SMTP settings are correct
- Test with the "Resend Email" button on the verification page

## Additional Customization

You can also customize:
- Email sender name (e.g., "Cherishly Team")
- Reply-to address
- Email footer links
- Brand logo in emails (upload to backend)
