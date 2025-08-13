import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = "Error",
  message,
  className = "",
}) => {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-red-800 mb-1">{title}</h3>
          <p className="text-sm text-red-700">{message}</p>
        </div>
      </div>
    </div>
  );
};