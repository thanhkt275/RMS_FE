import { useMemo } from "react";

interface PasswordStrengthProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  met: boolean;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const criteria = useMemo((): PasswordCriteria[] => {
    return [
      {
        label: "At least 8 characters",
        met: password.length >= 8,
      },
      {
        label: "Contains lowercase letter",
        met: /[a-z]/.test(password),
      },
      {
        label: "Contains uppercase letter", 
        met: /[A-Z]/.test(password),
      },
      {
        label: "Contains number",
        met: /\d/.test(password),
      },
      {
        label: "Contains special character",
        met: /[@$!%*?&]/.test(password),
      },
    ];
  }, [password]);

  const strengthScore = criteria.filter(c => c.met).length;
  const strengthLevel = 
    strengthScore <= 2 ? "weak" : 
    strengthScore <= 4 ? "medium" : 
    "strong";

  const strengthColor = 
    strengthLevel === "weak" ? "text-red-600" :
    strengthLevel === "medium" ? "text-yellow-600" :
    "text-green-600";

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Password strength:</span>
        <span className={`text-xs font-medium capitalize ${strengthColor}`}>
          {strengthLevel}
        </span>
      </div>
      
      <div className="space-y-1">
        {criteria.map((criterion, index) => (
          <div key={index} className="flex items-center text-xs">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              criterion.met ? "bg-green-500" : "bg-gray-300"
            }`} />
            <span className={criterion.met ? "text-green-600" : "text-gray-500"}>
              {criterion.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
