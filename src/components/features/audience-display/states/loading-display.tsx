import React from "react";
import { colors, typography, spacing, components, cn } from "../design-system";

interface LoadingDisplayProps {
  connectionError?: string | null;
  message?: string;
  showSpinner?: boolean;
}

export const LoadingDisplay: React.FC<LoadingDisplayProps> = ({
  connectionError,
  message = "Loading display...",
  showSpinner = true
}) => (
  <div className={cn("flex items-center justify-center min-h-screen", colors.gray[50])}>
    <div className={cn("text-center", components.card.base, spacing.padding.lg)}>
      {showSpinner && (
        <div className={cn(components.loading.spinner, "mx-auto mb-4")}></div>
      )}
      <h2 className={cn(typography.heading.lg, colors.text.primary)}>{message}</h2>
      {connectionError && (
        <div className={cn("mt-4", colors.error[50], "border border-red-200 rounded-lg", spacing.padding.sm)}>
          <p className={cn(typography.body.sm, colors.text.error)}>
            {connectionError}
          </p>
        </div>
      )}
    </div>
  </div>
);
