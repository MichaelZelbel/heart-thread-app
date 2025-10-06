import { z } from "zod";

// Password strength requirements
export const passwordRequirements = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*]/,
};

// Password validation schema
export const passwordSchema = z
  .string()
  .min(passwordRequirements.minLength, "Password must be at least 8 characters")
  .regex(passwordRequirements.hasUppercase, "Password must contain an uppercase letter")
  .regex(passwordRequirements.hasLowercase, "Password must contain a lowercase letter")
  .regex(passwordRequirements.hasNumber, "Password must contain a number")
  .regex(passwordRequirements.hasSpecial, "Password must contain a special character (!@#$%^&*)");

// Email validation schema
export const emailSchema = z.string().email("Please enter a valid email address");

// Password strength checker
export interface PasswordStrength {
  score: number; // 0-4
  label: "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";
  color: string;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const checks = {
    minLength: password.length >= passwordRequirements.minLength,
    hasUppercase: passwordRequirements.hasUppercase.test(password),
    hasLowercase: passwordRequirements.hasLowercase.test(password),
    hasNumber: passwordRequirements.hasNumber.test(password),
    hasSpecial: passwordRequirements.hasSpecial.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label: PasswordStrength["label"];
  let color: string;

  if (score === 0) {
    label = "Very Weak";
    color = "hsl(0 84.2% 60.2%)"; // destructive
  } else if (score <= 2) {
    label = "Weak";
    color = "hsl(25 85% 65%)"; // accent (orange)
  } else if (score === 3) {
    label = "Medium";
    color = "hsl(45 93% 47%)"; // yellow
  } else if (score === 4) {
    label = "Strong";
    color = "hsl(142 76% 36%)"; // green
  } else {
    label = "Very Strong";
    color = "hsl(142 76% 36%)"; // green
  }

  return { score, label, color, checks };
};

// Disposable email domains blocklist (common ones)
export const disposableEmailDomains = new Set([
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "tempmail.com",
  "throwaway.email",
  "getnada.com",
  "temp-mail.org",
  "fakeinbox.com",
  "maildrop.cc",
  "trashmail.com",
  "yopmail.com",
  "dispostable.com",
  "mintemail.com",
  "emailondeck.com",
  "sharklasers.com",
]);

export const isDisposableEmail = (email: string): boolean => {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? disposableEmailDomains.has(domain) : false;
};

// Validate email format and check for disposable domains
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  try {
    emailSchema.parse(email);
  } catch (error) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  if (isDisposableEmail(email)) {
    return {
      valid: false,
      error: "Disposable email addresses are not allowed. Please use a permanent email.",
    };
  }

  return { valid: true };
};

// Test user emails that should bypass verification
export const testUserEmails = new Set([
  "fred@cherishly.ai",
  "peter@cherishly.ai",
  "alec@cherishly.ai",
]);

export const isTestUser = (email: string): boolean => {
  return testUserEmails.has(email.toLowerCase());
};
