/**
 * BulkActions Component
 * Handles bulk operations on selected users
 */

import React, { useState, useCallback } from 'react';
import { BulkActionsProps, UserRole } from '../../../types/user.types';

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedUsers,
  onBulkDelete,
  onBulkChangeRole,
  disabled,
}) => {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.COMMON);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const hasSelection = selectedUsers.length > 0;
  const isDisabled = disabled || !hasSelection;

  /**
   * Handle bulk delete with confirmation
   */
  const handleBulkDelete = useCallback(async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for the delete operation');
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      alert('Reason must be at least 5 characters long');
      return;
    }

    try {
      setLoading(true);
      console.log('[BulkActions] Starting bulk delete:', { userIds: selectedUsers, reason: trimmedReason });
      
      await onBulkDelete(selectedUsers, trimmedReason);
      
      console.log('[BulkActions] Bulk delete completed successfully');
      setShowDeleteConfirm(false);
      setReason('');
    } catch (error) {
      console.error('[BulkActions] Bulk delete failed:', error);
      
      // Show more user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unable to identify current user')) {
        alert('Authentication error: Please refresh the page and try again.');
      } else {
        alert(`Delete failed: ${errorMessage || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedUsers, reason, onBulkDelete]);

  /**
   * Handle bulk role change
   */
  const handleBulkRoleChange = useCallback(async () => {
    if (!reason.trim()) {
      alert('Please provide a reason for the role change');
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      alert('Reason must be at least 5 characters long');
      return;
    }

    try {
      setLoading(true);
      console.log('[BulkActions] Starting bulk role change:', { 
        userIds: selectedUsers, 
        role: selectedRole, 
        reason: trimmedReason 
      });
      
      await onBulkChangeRole(selectedUsers, selectedRole, trimmedReason);
      
      console.log('[BulkActions] Bulk role change completed successfully');
      setShowRoleModal(false);
      setReason('');
    } catch (error) {
      console.error('[BulkActions] Bulk role change failed:', error);
      
      // Show more user-friendly error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unable to identify current user')) {
        alert('Authentication error: Please refresh the page and try again.');
      } else {
        alert(`Role change failed: ${errorMessage || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedUsers, selectedRole, reason, onBulkChangeRole]);

  /**
   * Reset modals
   */
  const resetModals = useCallback(() => {
    setShowRoleModal(false);
    setShowDeleteConfirm(false);
    setReason('');
    setSelectedRole(UserRole.COMMON);
  }, []);

  if (!hasSelection) {
    return (
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-sm text-gray-500">
          Select users to perform bulk actions
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg">
        <span className="text-sm text-blue-700 font-medium">
          {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
        </span>

        <div className="flex items-center space-x-2">
          {/* Change Role Button */}
          <button
            onClick={() => setShowRoleModal(true)}
            disabled={isDisabled || loading}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Change Role
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDisabled || loading}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Change Role for {selectedUsers.length} User{selectedUsers.length > 1 ? 's' : ''}
              </h3>

              {/* Role Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={UserRole.ADMIN}>Administrator</option>
                  <option value={UserRole.HEAD_REFEREE}>Head Referee</option>
                  <option value={UserRole.ALLIANCE_REFEREE}>Alliance Referee</option>
                  <option value={UserRole.TEAM_LEADER}>Team Leader</option>
                  <option value={UserRole.TEAM_MEMBER}>Team Member</option>
                  <option value={UserRole.COMMON}>Common User</option>
                </select>
              </div>

              {/* Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Change <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why these users' roles are being changed..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={resetModals}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkRoleChange}
                  disabled={loading || !reason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? 'Changing...' : 'Change Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
                Delete {selectedUsers.length} User{selectedUsers.length > 1 ? 's' : ''}?
              </h3>

              <p className="text-sm text-gray-600 mb-4 text-center">
                This action cannot be undone. The selected user{selectedUsers.length > 1 ? 's' : ''} will be permanently removed from the system.
              </p>

              {/* Reason Input */}
              <div className="mb-6">
                <label htmlFor="delete-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for deletion *
                </label>
                <textarea
                  id="delete-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for deleting these users..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={3}
                  required
                />
                {reason.trim() && reason.trim().length < 5 && (
                  <p className="text-red-500 text-xs mt-1">Reason must be at least 5 characters</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-center space-x-3">
                <button
                  onClick={resetModals}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={loading || !reason.trim() || reason.trim().length < 5}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActions;
