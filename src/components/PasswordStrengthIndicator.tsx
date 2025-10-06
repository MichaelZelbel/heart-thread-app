import { checkPasswordStrength } from "@/lib/auth-validation";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  if (!password) return null;

  const strength = checkPasswordStrength(password);

  return (
    <div className="space-y-2 text-sm">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Password Strength:</span>
          <span className="text-xs font-medium" style={{ color: strength.color }}>
            {strength.label}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(strength.score / 5) * 100}%`,
              backgroundColor: strength.color,
            }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1 text-xs">
        <RequirementCheck met={strength.checks.minLength} text="At least 8 characters" />
        <RequirementCheck met={strength.checks.hasUppercase} text="One uppercase letter" />
        <RequirementCheck met={strength.checks.hasLowercase} text="One lowercase letter" />
        <RequirementCheck met={strength.checks.hasNumber} text="One number" />
        <RequirementCheck met={strength.checks.hasSpecial} text="One special character (!@#$%^&*)" />
      </div>
    </div>
  );
};

interface RequirementCheckProps {
  met: boolean;
  text: string;
}

const RequirementCheck = ({ met, text }: RequirementCheckProps) => (
  <div className="flex items-center gap-1.5">
    {met ? (
      <Check className="w-3 h-3 text-green-600" />
    ) : (
      <X className="w-3 h-3 text-muted-foreground" />
    )}
    <span className={met ? "text-green-600" : "text-muted-foreground"}>{text}</span>
  </div>
);
