import React from "react";

interface LoadingDisplayProps {
  connectionError?: string | null;
}

export const LoadingDisplay: React.FC<LoadingDisplayProps> = ({ connectionError }) => (
  <div className="flex items-center justify-center h-screen w-screen bg-gray-50 px-4">
    <div className="text-center bg-white border border-gray-200 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 max-w-md w-full">
      <div className="w-12 sm:w-16 h-12 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Loading display...</h2>
      {connectionError && (
        <p className="mt-3 sm:mt-4 text-red-800 bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 text-sm">
          {connectionError}
        </p>
      )}
    </div>
  </div>
);
