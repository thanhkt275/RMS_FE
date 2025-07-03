import React from "react";

interface FieldNotFoundProps {
  fieldError: string | null;
  onBack: () => void;
}

export const FieldNotFound: React.FC<FieldNotFoundProps> = ({ fieldError, onBack }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center bg-red-50 border border-red-200 p-8 rounded-xl shadow-lg max-w-xl">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16 text-red-500 mx-auto mb-4"
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
      <h2 className="text-2xl font-semibold text-red-800 mb-4">Field Not Found</h2>
      <p className="text-red-700 mb-6">{fieldError}</p>
      <button
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
        onClick={onBack}
      >
        Back to Tournament Display
      </button>
    </div>
  </div>
);
