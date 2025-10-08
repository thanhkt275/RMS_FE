import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";
import { PlayoffBracketDisplayProps } from "./types/bracket.types";
import {
  MatchCard,
  ConnectionLines,
  RoundLabel,
  EmptyState,
  ErrorBoundary,
  MemoizedRound,
} from "./components";
import { useBracketLayout, useResponsiveScale } from "./hooks";
import { FIGMA_DESIGN } from "./utils/constants";
import { validateMatches } from "./utils/validation";
import { clearCalculationCache } from "./utils/bracketCalculations";
import { clearAllMatchHelperCaches } from "./utils/matchHelpers";
import {
  useMatchPositionFinder,
  useRoundCalculations,
  useStyleCalculations,
  useMatchDimensions,
  usePerformanceMonitor,
  useMemoizedMatchProcessing,
  useMemoizedBracketStructure,
  useMemoizedConnections,
  useMemoizedScaling,
  useMemoizedTeamData,
} from "./utils/performanceOptimizations";

const PlayoffBracketDisplay: React.FC<PlayoffBracketDisplayProps> = ({
  matches,
  stageName,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [retryCount, setRetryCount] = useState(0);

  // Performance monitoring in development
  usePerformanceMonitor("PlayoffBracketDisplay");

  // Memoized match processing for expensive operations
  const matchProcessing = useMemoizedMatchProcessing(matches || []);
  const teamData = useMemoizedTeamData(matches || []);

  // Validate input data early - memoized to prevent unnecessary re-validation
  const inputValidation = useMemo(
    () => validateMatches(matches || []),
    [matches]
  );

  // Memoized dimension update function to prevent unnecessary re-renders
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      try {
        const { clientWidth, clientHeight } = containerRef.current;
        // Only update if dimensions actually changed to prevent unnecessary re-renders
        setContainerDimensions((prev) => {
          if (prev.width !== clientWidth || prev.height !== clientHeight) {
            return { width: clientWidth, height: clientHeight };
          }
          return prev;
        });
      } catch (error) {
        console.warn("Error updating container dimensions:", error);
      }
    }
  }, []);

  // Update container dimensions on mount and resize
  useEffect(() => {
    // Initial dimension update with retry mechanism
    const initialUpdate = () => {
      updateDimensions();

      // If dimensions are still 0x0 after initial update, retry with a delay
      setTimeout(() => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          if (clientWidth === 0 || clientHeight === 0) {
            // Try using parent dimensions or fallback to reasonable defaults
            const parent = containerRef.current.parentElement;
            if (parent) {
              const parentWidth = parent.clientWidth || parent.offsetWidth;
              const parentHeight = parent.clientHeight || parent.offsetHeight;
              if (parentWidth > 0 && parentHeight > 0) {
                setContainerDimensions({
                  width: parentWidth,
                  height: parentHeight,
                });
              } else {
                // Fallback to reasonable defaults for development/testing
                setContainerDimensions({ width: 800, height: 600 });
              }
            } else {
              // Ultimate fallback
              setContainerDimensions({ width: 800, height: 600 });
            }
          }
        }
      }, 100);
    };

    // Use ResizeObserver for more accurate dimension tracking
    let resizeObserver: ResizeObserver | null = null;

    try {
      if (containerRef.current && "ResizeObserver" in window) {
        resizeObserver = new ResizeObserver((entries) => {
          try {
            for (const entry of entries) {
              const { width, height } = entry.contentRect;
              if (width > 0 && height > 0) {
                setContainerDimensions((prev) => {
                  if (prev.width !== width || prev.height !== height) {
                    return { width, height };
                  }
                  return prev;
                });
              }
            }
          } catch (error) {
            console.warn("Error in ResizeObserver callback:", error);
          }
        });
        resizeObserver.observe(containerRef.current);

        // Initial update after setting up observer
        initialUpdate();
      } else {
        // Fallback to window resize event
        initialUpdate();
        window.addEventListener("resize", updateDimensions);
      }
    } catch (error) {
      console.warn("Error setting up resize observer:", error);
      // Fallback to manual dimension update
      initialUpdate();
    }

    return () => {
      try {
        if (resizeObserver) {
          resizeObserver.disconnect();
        } else {
          window.removeEventListener("resize", updateDimensions);
        }
      } catch (error) {
        console.warn("Error cleaning up resize observer:", error);
      }
    };
  }, [updateDimensions]);

  // Cleanup caches on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      try {
        clearCalculationCache();
        clearAllMatchHelperCaches();
      } catch (error) {
        console.warn("Error clearing caches on unmount:", error);
      }
    };
  }, []);

  // Handle retry functionality - memoized to prevent unnecessary re-renders
  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  // Calculate bracket layout
  const { layout, baseDimensions, isLoading, error } = useBracketLayout(
    matches || [],
    containerDimensions
  );
  const { rounds, positions, dimensions, connections } = layout;

  // Memoized bracket structure analysis
  const bracketStructure = useMemoizedBracketStructure(
    rounds,
    containerDimensions
  );

  // Calculate responsive scaling with error handling - memoized for performance
  const scalingParams = useMemo(
    () => ({
      containerWidth: containerDimensions.width,
      containerHeight: containerDimensions.height,
      totalRounds: bracketStructure.totalRounds,
      maxMatchesInRound: bracketStructure.maxMatchesInRound,
    }),
    [
      containerDimensions.width,
      containerDimensions.height,
      bracketStructure.totalRounds,
      bracketStructure.maxMatchesInRound,
    ]
  );

  // Calculate responsive scaling - hooks must be called unconditionally
  const scaleResult = useResponsiveScale(scalingParams);

  // Handle potential errors in scaling result with fallback values
  const scaledDimensions = scaleResult?.scaledDimensions || {
    matchWidth: 213.33,
    matchHeight: 67.5,
    roundGap: 133.33,
    verticalGap: 67.5,
    scaleFactor: 1,
  };
  const scaleFactor = scaleResult?.scaleFactor || 1;
  const isScaled = scaleResult?.isScaled || false;

  // Determine what to render based on conditions (after all hooks have been called)
  const shouldShowInvalidData = !matches;
  const shouldShowNoMatches = matches && matches.length === 0;
  const shouldShowValidationError =
    matches && matches.length > 0 && !inputValidation.isValid;

  // Handle null or undefined matches
  if (shouldShowInvalidData) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "playoff-bracket-display",
          "w-full h-full overflow-hidden",
          className
        )}
        style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
      >
        <EmptyState
          type="invalid-data"
          message="No match data provided"
          details="The matches prop is null or undefined"
          onRetry={handleRetry}
          showRetry={true}
        />
      </div>
    );
  }

  // Handle empty matches array
  if (shouldShowNoMatches) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "playoff-bracket-display",
          "w-full h-full overflow-hidden",
          className
        )}
        style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
      >
        <EmptyState
          type="no-matches"
          message="No playoff matches available"
          onRetry={handleRetry}
          showRetry={retryCount > 0}
        />
      </div>
    );
  }

  // Handle input validation errors
  if (shouldShowValidationError) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "playoff-bracket-display",
          "w-full h-full overflow-hidden",
          className
        )}
        style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
      >
        <EmptyState
          type="invalid-data"
          message="Invalid match data"
          details={inputValidation.errors.slice(0, 3).join("; ")}
          onRetry={handleRetry}
          showRetry={true}
        />
      </div>
    );
  }

  // Memoized connection calculations
  const connectionData = useMemoizedConnections(rounds, positions, {
    roundGap: scaledDimensions.roundGap,
  });

  // Calculate total bracket dimensions for positioning - memoized for performance
  const bracketDimensions = useMemo(() => {
    const totalBracketWidth =
      bracketStructure.totalRounds * scaledDimensions.matchWidth +
      (bracketStructure.totalRounds - 1) * scaledDimensions.roundGap;
    const totalBracketHeight =
      scaledDimensions.matchHeight * bracketStructure.maxMatchesInRound +
      (bracketStructure.maxMatchesInRound - 1) * scaledDimensions.verticalGap;

    return { width: totalBracketWidth, height: totalBracketHeight };
  }, [
    bracketStructure.totalRounds,
    bracketStructure.maxMatchesInRound,
    scaledDimensions,
  ]);

  // Memoized scaling calculations with positioning
  const scalingCalculations = useMemoizedScaling(
    containerDimensions,
    bracketDimensions
  );

  // Legacy bracket dimensions for backward compatibility
  const legacyBracketDimensions = useMemo(
    () => ({
      totalBracketWidth: bracketDimensions.width,
      totalBracketHeight: bracketDimensions.height,
      roundLabelHeight: 40,
      availableContentHeight: containerDimensions.height - 40,
      offsetX: scalingCalculations.offsetX,
      offsetY: scalingCalculations.offsetY,
    }),
    [
      bracketDimensions,
      containerDimensions.height,
      scalingCalculations.offsetX,
      scalingCalculations.offsetY,
    ]
  );

  // Memoized performance optimizations
  const matchPositionFinder = useMatchPositionFinder(positions);
  const roundCalculations = useRoundCalculations(rounds, {
    matchWidth: baseDimensions.roundWidth,
    matchHeight: baseDimensions.matchHeight,
    roundGap: baseDimensions.roundGap,
    verticalGap: baseDimensions.matchVerticalGap,
    scaleFactor: 1, // Use base dimensions for positioning
  });
  const transformStyle = useStyleCalculations(
    scalingCalculations.scaleFactor,
    legacyBracketDimensions.offsetX,
    legacyBracketDimensions.offsetY
  );
  const matchDimensions = useMatchDimensions(scaledDimensions);

  // Error handler for ErrorBoundary - must be defined before any conditional returns
  const handleBracketError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      console.error("Bracket rendering error:", error, errorInfo);
    },
    []
  );

  // Additional condition checks (after all hooks have been called)
  // Only show "container too small" if dimensions are actually detected and are genuinely small
  // Don't show it for initial 0x0 dimensions which are just loading state
  const hasValidDimensions =
    containerDimensions.width > 0 && containerDimensions.height > 0;
  const shouldShowSmallContainer =
    hasValidDimensions &&
    (containerDimensions.width < 200 || containerDimensions.height < 100);
  const shouldShowLoading =
    isLoading ||
    (!hasValidDimensions &&
      !shouldShowInvalidData &&
      !shouldShowNoMatches &&
      !shouldShowValidationError);
  const shouldShowError = error;

  // Handle very small containers (only if we have valid dimensions)
  if (shouldShowSmallContainer) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "playoff-bracket-display",
          "w-full h-full overflow-hidden",
          className
        )}
        style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
      >
        <EmptyState
          type="container-too-small"
          message="Container too small"
          details={`Current: ${containerDimensions.width}×${containerDimensions.height}px, Minimum: 200×100px`}
        />
      </div>
    );
  }

  // Handle loading state
  if (shouldShowLoading) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "playoff-bracket-display",
          "w-full h-full overflow-hidden",
          className
        )}
        style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
      >
        <EmptyState type="loading" />
      </div>
    );
  }

  // Handle error state
  if (shouldShowError) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "playoff-bracket-display",
          "w-full h-full overflow-hidden",
          className
        )}
        style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
      >
        <EmptyState
          type="error"
          message="Error loading bracket"
          details={error}
          onRetry={handleRetry}
          showRetry={true}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={handleBracketError}
      fallback={
        <div
          className={cn(
            "playoff-bracket-display",
            "w-full h-full overflow-hidden",
            className
          )}
          style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
        >
          <EmptyState
            type="error"
            message="Bracket rendering failed"
            details="An unexpected error occurred while rendering the bracket"
            onRetry={handleRetry}
            showRetry={true}
          />
        </div>
      }
    >
      <div
        ref={containerRef}
        className={cn(
          "playoff-bracket-display",
          "relative w-full h-full",
          // Allow scrolling only if content doesn't fit even at minimum scale
          scalingCalculations.scaleFactor <= 0.4
            ? "overflow-auto"
            : "overflow-hidden",
          className
        )}
        style={{ backgroundColor: FIGMA_DESIGN.COLORS.BACKGROUND }}
      >
        {/* Bracket content container with scaling and centering */}
        <div className="relative w-full h-full" style={transformStyle}>
          {/* Connection lines (rendered behind matches) */}
          <ErrorBoundary
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  style={{
                    color: FIGMA_DESIGN.COLORS.GRAY_TEXT,
                    fontSize: "12px",
                  }}
                >
                  Connection lines unavailable
                </span>
              </div>
            }
          >
            <ConnectionLines
              connections={connections}
              className="absolute inset-0"
            />
          </ErrorBoundary>

          {/* Render rounds with matches and labels */}
          {roundCalculations.map((roundCalc, index) => {
            const roundMatches = rounds[index];

            return (
              <MemoizedRound
                key={`round-${roundCalc.roundIndex}`}
                roundMatches={roundMatches}
                roundIndex={roundCalc.roundIndex}
                totalRounds={rounds.length}
                isFinalRound={roundCalc.isFinalRound}
                roundX={roundCalc.roundX}
                positions={positions}
                scaledDimensions={scaledDimensions}
              />
            );
          })}
        </div>

        {/* Scale indicator for debugging (only shown when scaled) */}
        {!scalingCalculations.fitsWithoutScaling &&
          process.env.NODE_ENV === "development" && (
            <div
              className="absolute top-2 right-2 text-xs px-2 py-1 rounded max-w-xs"
              style={{
                backgroundColor: "rgba(0,0,0,0.8)",
                color: "white",
                fontSize: "10px",
                zIndex: 1000,
              }}
            >
              <div>
                Scale: {Math.round(scalingCalculations.scaleFactor * 100)}%
              </div>
              <div>
                Container: {containerDimensions.width}×
                {containerDimensions.height}
              </div>
              <div>
                Bracket: {Math.round(bracketDimensions.width)}×
                {Math.round(bracketDimensions.height)}
              </div>
              <div>
                Rounds: {bracketStructure.totalRounds}, Max matches:{" "}
                {bracketStructure.maxMatchesInRound}
              </div>
              <div>Reason: {scalingCalculations.scalingReason}</div>
              <div>
                Teams: {teamData.totalTeams}, Connections:{" "}
                {connectionData.totalConnections}
              </div>
              {inputValidation.warnings.length > 0 && (
                <div className="mt-1 text-yellow-300">
                  Warnings: {inputValidation.warnings.length}
                </div>
              )}
            </div>
          )}
      </div>
    </ErrorBoundary>
  );
};

export default PlayoffBracketDisplay;
