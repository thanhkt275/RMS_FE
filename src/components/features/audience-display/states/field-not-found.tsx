import React from "react";
import { colors, typography, spacing, components, responsive, cn } from "../design-system";

interface FieldNotFoundProps {
  fieldError: string | null;
  onBack: () => void;
}

export const FieldNotFound: React.FC<FieldNotFoundProps> = ({ fieldError, onBack }) => (
  <div className={cn("flex items-center justify-center min-h-screen", colors.gray[50], responsive.containerPadding)}>
    <div className={cn("text-center", colors.error[50], "border border-red-200", spacing.padding.lg, "rounded-xl shadow-lg max-w-xl w-full")}>
      <div className="w-16 h-16 text-red-500 mx-auto mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className={cn(responsive.text.heading, colors.text.error, "mb-4")}>Field Not Found</h2>
      <p className={cn(responsive.text.body, colors.text.error, "mb-6")}>{fieldError}</p>
      <button
        className={cn(components.button.primary, "shadow-md")}
        onClick={onBack}
      >
        Back to Tournament Display
      </button>
    </div>
  </div>
);
