const GARBAGE_SEQUENCE_NUMBERS = new Set(['1234567890']);

export function normalizeIndianMobile(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.startsWith('91') && digits.length > 10) {
    return digits.slice(2, 12);
  }

  if (digits.length > 10) {
    return digits.slice(-10);
  }

  return digits;
}

export function isGarbageIndianMobile(phone: string): boolean {
  return /^(\d)\1{9}$/.test(phone) || GARBAGE_SEQUENCE_NUMBERS.has(phone);
}

export function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone) && !isGarbageIndianMobile(phone);
}

export function getIndianMobileValidationError(input: string): string | null {
  const normalized = normalizeIndianMobile(input);

  if (!normalized) {
    return null;
  }

  if (normalized.length !== 10) {
    return 'Enter a valid 10-digit mobile number.';
  }

  if (!/^[6-9]/.test(normalized)) {
    return 'Enter a valid 10-digit mobile number.';
  }

  if (isGarbageIndianMobile(normalized)) {
    return 'Enter a valid 10-digit mobile number.';
  }

  return null;
}

export function parsePatientPhone(input: string, noPhone: boolean): {
  phone: string | null;
  error: string | null;
} {
  if (noPhone) {
    return { phone: null, error: null };
  }

  const normalized = normalizeIndianMobile(input);
  const error = getIndianMobileValidationError(normalized);
  if (error) {
    return { phone: null, error };
  }

  return { phone: normalized, error: null };
}
