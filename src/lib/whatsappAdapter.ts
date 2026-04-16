type SendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

type AppointmentMessageParams = {
  toPhone: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  date: string;
  tokenNumber: number;
  portalUrl?: string;
};

type CancellationMessageParams = {
  toPhone: string;
  patientName: string;
  clinicName: string;
};

type PortalLinkMessageParams = {
  toPhone: string;
  patientName: string;
  clinicName: string;
  portalUrl: string;
};

type PatientOtpMessageParams = {
  toPhone: string;
  clinicName: string;
  otp: string;
};

type WhatsAppConfig = {
  token: string | null;
  phoneNumberId: string | null;
  businessAccountId: string | null;
};

const WHATSAPP_BASE_URL = 'https://graph.facebook.com/v19.0';

function getConfig(): WhatsAppConfig {
  return {
    token: process.env.WHATSAPP_TOKEN ?? null,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? null,
  };
}

function formatPhoneNumber(input: string): string {
  const digitsOnly = input.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  const numericDigits = digitsOnly.replace(/\D/g, '');

  if (digitsOnly.startsWith('+')) {
    return `+${numericDigits}`;
  }

  if (numericDigits.length === 10) {
    return `+91${numericDigits}`;
  }

  if (numericDigits.length > 10 && !numericDigits.startsWith('0')) {
    return `+${numericDigits}`;
  }

  return numericDigits;
}

async function sendTextMessage(toPhone: string, body: string): Promise<SendResult> {
  const { token, phoneNumberId, businessAccountId } = getConfig();

  if (!token || !phoneNumberId) {
    console.warn('WhatsApp not configured', {
      hasToken: Boolean(token),
      hasPhoneNumberId: Boolean(phoneNumberId),
      hasBusinessAccountId: Boolean(businessAccountId),
    });
    return { success: false, error: 'WhatsApp not configured' };
  }

  const normalizedPhone = formatPhoneNumber(toPhone);

  try {
    const response = await fetch(`${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: {
          body,
        },
      }),
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          messages?: Array<{ id?: string }>;
          error?: { message?: string };
        }
      | null;

    if (!response.ok) {
      return {
        success: false,
        error: payload?.error?.message ?? 'WhatsApp send failed',
      };
    }

    return {
      success: true,
      messageId: payload?.messages?.[0]?.id,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'WhatsApp send failed',
    };
  }
}

export async function sendAppointmentConfirmation(
  params: AppointmentMessageParams
): Promise<SendResult> {
  const message = [
    `Hello ${params.patientName},`,
    '',
    `Your appointment at ${params.clinicName} is confirmed.`,
    `Doctor: Dr. ${params.doctorName}`,
    `Date: ${params.date}`,
    `Token Number: ${params.tokenNumber}`,
    '',
    'Please keep this token ready when you arrive.',
    ...(params.portalUrl
      ? ['', 'View your health records anytime:', params.portalUrl, '', 'This link is valid for 24 hours.']
      : []),
  ].join('\n');

  return sendTextMessage(params.toPhone, message);
}

export async function sendAppointmentReminder(
  params: AppointmentMessageParams
): Promise<SendResult> {
  const message = [
    `Hello ${params.patientName},`,
    '',
    `This is a reminder for your appointment at ${params.clinicName}.`,
    `Doctor: Dr. ${params.doctorName}`,
    `Date: ${params.date}`,
    `Token Number: ${params.tokenNumber}`,
    '',
    'Please arrive a little before your turn.',
  ].join('\n');

  return sendTextMessage(params.toPhone, message);
}

export async function sendCancellationNotice(
  params: CancellationMessageParams
): Promise<SendResult> {
  const message = [
    `Hello ${params.patientName},`,
    '',
    `Your appointment update from ${params.clinicName}:`,
    'This visit has been marked as cancelled.',
    '',
    'Please contact the clinic if you need to reschedule.',
  ].join('\n');

  return sendTextMessage(params.toPhone, message);
}

export async function sendPortalLink(
  params: PortalLinkMessageParams
): Promise<SendResult> {
  const message = [
    `Hello ${params.patientName},`,
    '',
    `Here is your secure patient portal link for ${params.clinicName}:`,
    params.portalUrl,
    '',
    'This link is valid for 24 hours.',
    'If it expires, ask the clinic to send a new one.',
  ].join('\n');

  return sendTextMessage(params.toPhone, message);
}

export async function sendPatientOtp(
  params: PatientOtpMessageParams
): Promise<SendResult> {
  const message = [
    `Your Medilite AI login code for ${params.clinicName}:`,
    params.otp,
    '',
    'This code is valid for 5 minutes.',
    'Do not share it with anyone.',
  ].join('\n');

  return sendTextMessage(params.toPhone, message);
}
