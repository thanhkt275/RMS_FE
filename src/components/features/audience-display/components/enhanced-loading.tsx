import React from "react";
import { colors, typography, spacing, components, responsive, cn } from "../design-system";

interface EnhancedLoadingProps {
  type?: 'teams' | 'matches' | 'rankings' | 'general';
  message?: string;
  showSpinner?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const loadingMessages = {
  teams: "Loading tournament teams...",
  matches: "Loading match schedule...",
  rankings: "Loading team rankings...",
  general: "Loading content..."
};

const loadingIcons = {
  teams: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  matches: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  rankings: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  general: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
};

const sizeClasses = {
  sm: {
    container: "p-4",
    icon: "w-8 h-8",
    spinner: "w-8 h-8 border-2",
    text: typography.body.sm,
    spacing: "space-y-2"
  },
  md: {
    container: spacing.padding.md,
    icon: "w-12 h-12",
    spinner: "w-12 h-12 border-3",
    text: typography.body.md,
    spacing: "space-y-3"
  },
  lg: {
    container: spacing.padding.lg,
    icon: "w-16 h-16",
    spinner: "w-16 h-16 border-4",
    text: typography.heading.sm,
    spacing: "space-y-4"
  }
};

export const EnhancedLoading: React.FC<EnhancedLoadingProps> = ({
  type = 'general',
  message,
  showSpinner = true,
  size = 'md',
  className
}) => {
  const displayMessage = message || loadingMessages[type];
  const icon = loadingIcons[type];
  const sizeConfig = sizeClasses[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      components.card.base,
      sizeConfig.container,
      sizeConfig.spacing,
      className
    )}>
      {showSpinner ? (
        <div className={cn(
          "border-blue-500 border-t-transparent rounded-full animate-spin",
          sizeConfig.spinner
        )}></div>
      ) : (
        <div className={cn(sizeConfig.icon, colors.text.muted)}>
          {icon}
        </div>
      )}
      
      <div className={cn(sizeConfig.text, colors.text.primary, "font-medium")}>
        {displayMessage}
      </div>
      
      <div className={cn("flex space-x-1")}>
        <div className={cn("w-2 h-2 rounded-full", colors.primary[500], "animate-bounce")}></div>
        <div className={cn("w-2 h-2 rounded-full", colors.primary[500], "animate-bounce")} style={{ animationDelay: '0.1s' }}></div>
        <div className={cn("w-2 h-2 rounded-full", colors.primary[500], "animate-bounce")} style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
};

// Skeleton loading components for different content types
export const TeamsSkeleton = () => (
  <div className={cn(components.card.base, "overflow-hidden")}>
    <div className={cn(colors.gray[50], "px-5 py-3.5")}>
      <div className="flex space-x-4">
        <div className={cn("h-4", colors.gray[300], "rounded w-20")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-32")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-24 hidden md:block")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-28 hidden lg:block")}></div>
      </div>
    </div>
    <div className="divide-y divide-gray-200">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="px-5 py-4">
          <div className="flex space-x-4">
            <div className={cn("h-5", colors.gray[300], "rounded w-16")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-40")}></div>
            <div className={cn("h-4", colors.gray[300], "rounded w-32 hidden md:block")}></div>
            <div className={cn("h-4", colors.gray[300], "rounded w-24 hidden lg:block")}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const MatchesSkeleton = () => (
  <div className={cn(components.card.base, "overflow-hidden")}>
    <div className={cn(colors.gray[50], "px-5 py-3.5")}>
      <div className="flex space-x-4">
        <div className={cn("h-4", colors.gray[300], "rounded w-16")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-20")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-32")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-32")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-20")}></div>
      </div>
    </div>
    <div className="divide-y divide-gray-200">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="px-5 py-4">
          <div className="flex space-x-4">
            <div className={cn("h-5", colors.gray[300], "rounded w-12")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-16")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-48")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-48")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-16")}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const RankingsSkeleton = () => (
  <div className={cn(components.card.base, "overflow-hidden")}>
    <div className={cn(colors.gray[50], "px-5 py-3.5")}>
      <div className="flex space-x-4">
        <div className={cn("h-4", colors.gray[300], "rounded w-12")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-32")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-16")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-16")}></div>
        <div className={cn("h-4", colors.gray[300], "rounded w-20")}></div>
      </div>
    </div>
    <div className="divide-y divide-gray-200">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="px-5 py-4">
          <div className="flex space-x-4">
            <div className={cn("h-5", colors.gray[300], "rounded w-8")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-40")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-12")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-12")}></div>
            <div className={cn("h-5", colors.gray[300], "rounded w-16")}></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
