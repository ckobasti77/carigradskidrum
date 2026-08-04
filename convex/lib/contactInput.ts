export const CONTACT_TOPICS = [
  "company",
  "card",
  "partnership",
  "support",
  "other",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_INPUT_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 320,
  phoneMax: 40,
  messageMin: 20,
  messageMax: 4000,
} as const;

export type ContactField = "name" | "email" | "phone" | "message";
export type ContactFieldErrors = Partial<Record<ContactField, "invalid">>;

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactInput(input: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone?.trim() ?? "";
  const message = input.message.trim();

  if (
    name.length < CONTACT_INPUT_LIMITS.nameMin ||
    name.length > CONTACT_INPUT_LIMITS.nameMax
  ) {
    errors.name = "invalid";
  }
  if (
    email.length > CONTACT_INPUT_LIMITS.emailMax ||
    !SIMPLE_EMAIL_RE.test(email)
  ) {
    errors.email = "invalid";
  }
  if (phone.length > CONTACT_INPUT_LIMITS.phoneMax) {
    errors.phone = "invalid";
  }
  if (
    message.length < CONTACT_INPUT_LIMITS.messageMin ||
    message.length > CONTACT_INPUT_LIMITS.messageMax
  ) {
    errors.message = "invalid";
  }

  return errors;
}
