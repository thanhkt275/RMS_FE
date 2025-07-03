/**
 * UserSearch Component
 * Real-time user search functionality
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UserSearchProps, User } from '../../types/user.types';

export const UserSearch: React.FC<UserSearchProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search users...',
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  /**
   * Handle input change with debouncing
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    // Debounce search submission
    if (newValue.trim()) {
      debounceRef.current = window.setTimeout(() => {
        onSubmit(newValue.trim());
      }, 300);
    }
  }, [onChange, onSubmit]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  }, [value, onSubmit]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
      onChange('');
    }
  }, [onChange]);

  /**
   * Clear search
   */
  const clearSearch = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative flex items-center bg-white border rounded-lg transition-colors ${
            isFocused
              ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Search Icon */}
          <div className="flex items-center justify-center w-10 h-10 text-gray-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 px-2 py-2 text-sm bg-transparent border-none outline-none placeholder-gray-500 disabled:cursor-not-allowed"
            autoComplete="off"
          />

          {/* Clear Button */}
          {value && !disabled && (
            <button
              type="button"
              onClick={clearSearch}
              className="flex items-center justify-center w-8 h-8 mr-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Clear search"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}

          {/* Search Button */}
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="flex items-center justify-center w-10 h-10 text-white bg-blue-500 rounded-r-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            title="Search"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      </form>

      {/* Search Hints */}
      {isFocused && !value && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <p className="text-xs text-gray-500 mb-2">Search by:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Username or email</li>
            <li>• Phone number</li>
            <li>• Role (admin, referee, etc.)</li>
          </ul>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Advanced Search Component with filters
 */
interface AdvancedSearchProps extends UserSearchProps {
  onRoleFilter: (role: string | null) => void;
  onStatusFilter: (status: boolean | null) => void;
  selectedRole?: string | null;
  selectedStatus?: boolean | null;
}

export const AdvancedUserSearch: React.FC<AdvancedSearchProps> = ({
  value,
  onChange,
  onSubmit,
  onRoleFilter,
  onStatusFilter,
  selectedRole,
  selectedStatus,
  placeholder = 'Search users...',
  disabled = false,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-3">
      {/* Main Search */}
      <UserSearch
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg
            className={`w-4 h-4 mr-1 transition-transform ${
              showFilters ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
          Advanced Filters
        </button>

        {/* Active Filter Count */}
        {(selectedRole || selectedStatus !== null) && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {[selectedRole, selectedStatus !== null ? 'status' : null]
              .filter(Boolean).length}{' '}
            filter{[selectedRole, selectedStatus !== null ? 'status' : null]
              .filter(Boolean).length > 1 ? 's' : ''} active
          </span>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={selectedRole || ''}
              onChange={(e) => onRoleFilter(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Administrator</option>
              <option value="HEAD_REFEREE">Head Referee</option>
              <option value="ALLIANCE_REFEREE">Alliance Referee</option>
              <option value="TEAM_LEADER">Team Leader</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="COMMON">Common User</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus === null || selectedStatus === undefined ? '' : selectedStatus.toString()}
              onChange={(e) =>
                onStatusFilter(
                  e.target.value === '' ? null : e.target.value === 'true'
                )
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
