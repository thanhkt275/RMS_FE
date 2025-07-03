import React from "react";

interface LoadingDisplayProps {
  connectionError?: string | null;
}

export const LoadingDisplay: React.FC<LoadingDisplayProps> = ({ connectionError }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center bg-white border border-gray-200 rounded-xl shadow-lg p-8">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-900">Loading display...</h2>
      {connectionError && (
        <p className="mt-4 text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
          {connectionError}
        </p>
      )}
    </div>
  </div>
);
