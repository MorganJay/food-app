# Infobip Integration Guide

This document describes the Infobip integration for SMS, Email, and WhatsApp notifications.

## Overview

The notification system has been refactored to use Infobip as the primary provider with support for:

- **SMS** - Text message delivery
- **Email** - Email delivery with HTML support
- **WhatsApp** - WhatsApp Business messaging

The architecture is **extensible** and **swappable** - you can easily switch to another provider by implementing the same interfaces.

## Configuration

All configuration is done via environment variables. Copy the `.env.example` file to `.env` and fill in your Infobip credentials.

### Required Variables

```env
INFOBIP_BASE_URL=https://api.infobip.com  # Or your regional endpoint
INFOBIP_API_KEY=your-api-key-here
INFOBIP_SMS_SENDER_ID=Chopbaze            # Sender name for SMS
```

### Optional Variables

```env
INFOBIP_WHATSAPP_SENDER_ID=123456789      # Phone number ID for WhatsApp
INFOBIP_EMAIL_FROM_ADDRESS=noreply@chopbaze.com
INFOBIP_EMAIL_FROM_NAME=Chopbaze
OTP_CHANNELS=SMS,EMAIL,WHATSAPP           # Channels to use for OTP
```

## Usage

### Sending SMS

```typescript
import { NotificationsService } from './notifications/notifications.service';

constructor(private notificationsService: NotificationsService) {}

async sendAlert() {
  const result = await this.notificationsService.sendSms({
    to: '+1234567890',
    message: 'Your alert message here'
  });
  console.log(result); // { success: true, messageId: '...' }
}
```

### Sending Email

```typescript
async sendEmail() {
  const result = await this.notificationsService.sendEmail({
    to: 'user@example.com',
    subject: 'Welcome to Chopbaze',
    body: '<h1>Welcome!</h1><p>Your account has been created.</p>'
  });
  console.log(result); // { success: true, messageId: '...' }
}
```

### Sending WhatsApp

```typescript
async sendWhatsAppMessage() {
  const result = await this.notificationsService.sendWhatsApp({
    to: '+1234567890',
    message: 'Hello! This is a WhatsApp message from Chopbaze.'
  });
  console.log(result); // { success: true, messageId: '...' }
}
```

### OTP Delivery (Multiple Channels)

```typescript
import { OtpDeliveryService, OtpRecipient } from './auth/otp-delivery.service';

constructor(private otpDeliveryService: OtpDeliveryService) {}

async sendOtp() {
  const recipient: OtpRecipient = {
    phoneNumber: '+1234567890',
    email: 'user@example.com'
  };

  const results = await this.otpDeliveryService.sendOtp(recipient, '123456');
  // Results will show which channels succeeded/failed
}
```

The OTP channels used are configured via `OTP_CHANNELS` environment variable.

## Architecture

### Provider Pattern

The system uses an **interface-based provider pattern** for extensibility:

1. **SmsProvider** - Interface for SMS functionality
2. **EmailProvider** - Interface for Email functionality
3. **WhatsAppProvider** - Interface for WhatsApp functionality

The `InfobipProvider` implements all three interfaces, but you can easily swap it with another provider by:

1. Creating a new provider class implementing the same interfaces
2. Updating the service to use the new provider
3. No other code changes needed

### Service Layers

```
NotificationsController
    ↓
NotificationsService → InfobipProvider → Infobip API
    ↓
(sendSms, sendEmail, sendWhatsApp)
```

```
OtpDeliveryService → InfobipProvider → Infobip API
    ↓
(sendOtp via SMS, Email, or WhatsApp)
```

## Error Handling

All provider methods return a consistent response object:

```typescript
{
  success: boolean;
  messageId?: string;  // Message ID from Infobip
  reason?: string;     // Error reason if success=false
}
```

If the API key is not configured, requests will be logged and return `success: false` without making API calls.

## Extending with Another Provider

To add a new provider (e.g., Twilio, SendGrid):

1. Create a new provider file: `src/auth/sms/twilio.provider.ts`
2. Implement the same interfaces:
   ```typescript
   export class TwilioProvider implements SmsProvider, EmailProvider {
     async sendSms(phone: string, message: string) { ... }
     async sendOtp(phone: string, code: string) { ... }
     async sendEmail(email: string, subject: string, body: string) { ... }
     async sendEmailOtp(email: string, code: string) { ... }
   }
   ```
3. Update services to use the new provider
4. Update environment variables if needed

## Fallback Behavior

The system maintains backward compatibility:

- If `INFOBIP_API_KEY` is not set, it will check for `TERMII_API_KEY`
- If neither is set, the system will log messages without sending them
- This allows for safe deployment without credentials

## Testing

When testing without API credentials:

```bash
# Set invalid/empty credentials
INFOBIP_API_KEY=
```

The system will log mock requests:

```
[Infobip Mock] SMS to +1234567890: Your message here
[Infobip Mock] Email to user@example.com: Subject...
[Infobip Mock] WhatsApp to +1234567890: Your message here
```

## Monitoring & Logs

All sent messages are logged with:

- Provider name (e.g., `[Infobip SMS]`)
- Recipient
- Response from provider
- Any errors that occurred

Monitor application logs to track delivery status:

```
[Infobip SMS] Sent to +1234567890: { messageId: '123...', status: { id: 1 } }
[Infobip Email] Sent to user@example.com: { messageId: '456...' }
[Infobip WhatsApp] Sent to +1234567890: { messageId: '789...' }
```

## Next Steps

1. **Get Infobip Credentials**: Sign up at https://www.infobip.com/ and get your API key
2. **Configure Environment**: Add credentials to `.env`
3. **Test**: Use the examples above to test each channel
4. **Monitor**: Watch logs for delivery status
5. **Optional**: Set up WhatsApp Business Account for WhatsApp messages
