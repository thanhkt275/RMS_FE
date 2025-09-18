/**
 * UserSearch Component
 * Real-time user search functionality with improved UI and logic
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UserSearchProps } from '../../../types/user.types';

export const UserSearch: React.FC<UserSearchProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search users...',
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  /**
   * Handle input change with improved debouncing
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    // Handle empty search
    if (!newValue.trim()) {
      setIsSearching(false);
      onSubmit(''); // Clear search
      return;
    }

    // Set searching state
    setIsSearching(true);

    // Debounce search submission
    debounceRef.current = window.setTimeout(() => {
      onSubmit(newValue.trim());
      setIsSearching(false);
    }, 300);
  }, [onChange, onSubmit]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = value.trim();
    
    if (trimmedValue) {
      setIsSearching(true);
      onSubmit(trimmedValue);
      setIsSearching(false);
    } else {
      onSubmit(''); // Clear search
    }
  }, [value, onSubmit]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
      onChange('');
      onSubmit(''); // Clear search
      setIsFocused(false);
    }
  }, [onChange, onSubmit]);

  /**
   * Clear search with proper state management
   */
  const clearSearch = useCallback(() => {
    onChange('');
    onSubmit(''); // Clear search
    setIsSearching(false);
    inputRef.current?.focus();
  }, [onChange, onSubmit]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Clear search when value becomes empty externally
  useEffect(() => {
    if (!value && isSearching) {
      setIsSearching(false);
    }
  }, [value, isSearching]);

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative flex items-center bg-white border-2 rounded-lg transition-all duration-200 ${
            isFocused
              ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Search Icon */}
          <div className="flex items-center justify-center w-10 h-10 text-gray-500">
            {isSearching ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
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
            )}
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
            className="flex-1 px-2 py-2.5 text-sm bg-transparent border-none outline-none placeholder-gray-500 disabled:cursor-not-allowed font-medium text-gray-900"
            autoComplete="off"
          />

          {/* Clear Button */}
          {value && !disabled && (
            <button
              type="button"
              onClick={clearSearch}
              className="flex items-center justify-center w-8 h-8 mr-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
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
            disabled={disabled || (!value.trim() && !isSearching)}
            className="flex items-center justify-center w-10 h-10 text-white bg-blue-600 rounded-r-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200"
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

      {/* Search Hints - Only show when focused and no value */}
      {isFocused && !value && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-10">
          <p className="text-xs text-gray-700 mb-2 font-semibold">Search by:</p>
          <ul className="text-xs text-gray-800 space-y-1">
            <li>• Username or email</li>
            <li>• Phone number</li>
            <li>• Role (admin, referee, etc.)</li>
          </ul>
          <div className="mt-3 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-800 font-semibold">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}

      {/* Search Status */}
      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg z-10">
          <div className="flex items-center text-xs text-blue-800 font-medium">
            <svg className="w-3 h-3 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Searching...
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

  /**
   * Clear all filters
   */
  const clearAllFilters = useCallback(() => {
    onChange('');
    onSubmit('');
    onRoleFilter(null);
    onStatusFilter(null);
  }, [onChange, onSubmit, onRoleFilter, onStatusFilter]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = value || selectedRole || selectedStatus !== null;

  return (
    <div className="space-y-4">
      {/* Main Search */}
      <UserSearch
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-sm text-gray-700 hover:text-gray-900 transition-colors font-medium"
        >
          <svg
            className={`w-4 h-4 mr-2 transition-transform duration-200 ${
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

        {/* Active Filter Count and Clear */}
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded transition-colors font-medium"
              title="Clear all filters"
            >
              Clear all
            </button>
          )}
          
          {hasActiveFilters && (
            <span className="text-xs text-blue-800 bg-blue-100 px-3 py-1.5 rounded-lg font-semibold border border-blue-300">
              {[value, selectedRole, selectedStatus !== null ? 'status' : null]
                .filter(Boolean).length}{' '}
              filter{[value, selectedRole, selectedStatus !== null ? 'status' : null]
                .filter(Boolean).length > 1 ? 's' : ''} active
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Role
            </label>
            <select
              value={selectedRole || ''}
              onChange={(e) => onRoleFilter(e.target.value || null)}
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium text-gray-900 bg-white"
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
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Status
            </label>
            <select
              value={selectedStatus === null || selectedStatus === undefined ? '' : selectedStatus.toString()}
              onChange={(e) =>
                onStatusFilter(
                  e.target.value === '' ? null : e.target.value === 'true'
                )
              }
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium text-gray-900 bg-white"
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
