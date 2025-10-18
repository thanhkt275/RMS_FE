/***
 * BulkUserCreation Component
 * Allows ADMIN users to create multiple users at once with predefined roles
 */

import React, { useState, useCallback, useMemo } from 'react';
import { UserRole } from '../../../types/user.types';

interface BulkUserCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUserCreation: React.FC<BulkUserCreationProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.HEAD_REFEREE);
  const [userCount, setUserCount] = useState<number>(5);
  const [usernamePrefix, setUsernamePrefix] = useState<string>('referee');
  const [password, setPassword] = useState<string>('S4vntest@');
  const [emails, setEmails] = useState<string[]>([]);
  const [sendEmails, setSendEmails] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);



  // Update emails array when userCount changes
  React.useEffect(() => {
    setEmails(prev => {
      const newEmails = [...prev];
      newEmails.length = userCount;
      return newEmails.fill('', prev.length, userCount);
    });
  }, [userCount]);

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  // Generate preview usernames based on userCount
  const previewUsernames = useMemo(() => {
    const usernames = [];
    for (let i = 1; i <= userCount; i++) {
      usernames.push(`${usernamePrefix}${i}`);
    }
    return usernames.join(', ');
  }, [userCount, usernamePrefix]);

  const resetForm = useCallback(() => {
    setSelectedRole(UserRole.HEAD_REFEREE);
    setUserCount(5);
    setUsernamePrefix('referee');
    setPassword('Password123');
    setEmails(new Array(5).fill(''));
    setSendEmails(false);
    setProgress(null);
    setError(null);
  }, []);

  // Role options for bulk creation (as requested by user)
  const roleOptions = [
    { value: UserRole.ADMIN, label: 'ADMIN' },
    { value: UserRole.HEAD_REFEREE, label: 'HEAD REFEREE' },
    { value: UserRole.ALLIANCE_REFEREE, label: 'ALLIANCE REFEREE' },
    { value: UserRole.TEAM_LEADER, label: 'TEAM LEADER' },
  ];

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usernamePrefix.trim()) {
      setError('Username prefix is required');
      return;
    }

    if (userCount < 1 || userCount > 50) {
      setError('User count must be between 1 and 50');
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (sendEmails) {
    const filledEmails = emails.filter(email => email.trim());
    if (filledEmails.length !== userCount) {
    setError('Please provide an email address for each user when sending emails');
      return;
      }
    const invalidEmails = filledEmails.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidEmails.length > 0) {
    setError('Please provide valid email addresses');
    return;
    }
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: userCount, message: 'Starting user creation...' });

    try {
      // Import userService dynamically to avoid circular imports
      const { userService } = await import('../../../services/user-api');

      const createdUsers = [];
      const emailData = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i <= userCount; i++) {
        const username = `${usernamePrefix}${i}`;
        const name = `${selectedRole.replace('_', ' ')} ${i}`;

        setProgress({
          current: i,
          total: userCount,
          message: `Creating user ${i}/${userCount}: ${username}...`
        });

        try {
          const email = emails[i - 1]?.trim() || undefined;
          const userData = {
            name,
            username,
            password,
            role: selectedRole,
            email,
          };

          const createdUser = await userService.createUser(userData);
          createdUsers.push(createdUser);
          successCount++;

          // Add a small delay between user creations to avoid overwhelming the database
          if (i < userCount) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
          }

          // Collect email data for bulk sending
          if (sendEmails && email) {
          emailData.push({
          email,
          username,
          password,
          role: selectedRole,
          });
          }
        } catch (userError) {
          console.error(`Failed to create user ${username}:`, userError);
          errorCount++;
        }
      }

      setProgress({
        current: userCount,
        total: userCount,
        message: `Completed: ${successCount} users created${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      });

      // Send bulk emails if requested\n      if (sendEmails && emailData.length > 0) {\n        try {\n          setProgress({\n            current: userCount,\n            total: userCount,\n            message: 'Sending emails...'\n          });\n\n          console.log('Sending bulk emails for', emailData.length, 'users');\n          const emailResult = await userService.sendBulkUserCreationEmails(emailData);\n          console.log('Bulk email result:', emailResult);\n\n          setProgress({\n            current: userCount,\n            total: userCount,\n            message: `Completed: ${successCount} users created, ${emailResult.sent} emails sent`\n          });\n        } catch (emailError) {\n          console.error('Bulk email sending failed:', emailError);\n          setProgress({\n            current: userCount,\n            total: userCount,\n            message: `Users created but email sending failed`\n          });\n        }\n      }

      // Show success message
      alert(`Bulk user creation completed!\n\nCreated: ${successCount} users\nFailed: ${errorCount} users\n\nRole: ${selectedRole}\nPrefix: ${usernamePrefix}`);

      onSuccess();

    } catch (error) {
      console.error('Bulk user creation failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(null), 2000); // Clear progress after 2 seconds
    }
  }, [selectedRole, userCount, usernamePrefix, password, sendEmails, onSuccess]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Bulk User Creation</h2>
            <button
            onClick={() => {
              resetForm();
              onClose();
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Indicator */}
          {progress && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">Creating Users...</span>
                  <span className="text-sm text-blue-600">{progress.current}/{progress.total}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-2">{progress.message}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
          <div className="mb-6 bg-red-900 border-2 border-red-700 rounded-lg p-4">
          <div className="flex items-start">
          <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-200 font-medium">{error}</span>
          </div>
          </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Role *
              </label>
              <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium disabled:bg-gray-100 disabled:border-gray-400 disabled:text-gray-500"
              disabled={loading}
              required
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Users *
              </label>
              <input
              type="number"
              min="1"
              max="50"
              value={userCount}
              onChange={(e) => setUserCount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium disabled:bg-gray-100 disabled:border-gray-400 disabled:text-gray-500"
              disabled={loading}
              required
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 50 users per batch</p>
            </div>

            {/* Username Prefix */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username Prefix *
              </label>
              <input
              type="text"
              value={usernamePrefix}
              onChange={(e) => setUsernamePrefix(e.target.value)}
              placeholder="e.g., referee, admin, head_ref"
              className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium disabled:bg-gray-100 disabled:border-gray-400 disabled:text-gray-500"
              disabled={loading}
              required
              />
              <p className="text-xs text-gray-500 mt-1">
                Users will be created as: {usernamePrefix}1, {usernamePrefix}2, etc.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password for all users (min 6 chars, uppercase, lowercase, number)"
              className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium disabled:bg-gray-100 disabled:border-gray-400 disabled:text-gray-500"
              disabled={loading}
              required
              minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Must contain uppercase, lowercase, number, and be at least 6 characters</p>
            </div>

            {/* Email Configuration */}
            <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border">
            Email Addresses (Optional)
            </label>

            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
            {Array.from({ length: userCount }, (_, index) => (
            <div key={index} className="p-3 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 min-w-0 w-20">
                User {index + 1}:
              </span>
              <input
              type="email"
              value={emails[index] || ''}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              placeholder={`Email for ${usernamePrefix}${index + 1}`}
              className="flex-1 px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium disabled:bg-gray-100 disabled:border-gray-400 disabled:text-gray-500"
              disabled={loading}
              />
            </div>
            </div>
            ))}
            </div>

            <div className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                "💡 Enter individual email addresses for each user. Emails will be sent using the backend email service."
              </div>
            </div>

            {/* Send Emails Option */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <input
                  id="sendEmails"
                  type="checkbox"
                  checked={sendEmails}
                  onChange={(e) => setSendEmails(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="sendEmails" className="ml-3 block text-sm font-medium text-gray-900">
                  Send login credentials via email to users
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-900 text-white rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
            </h4>
            <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Role:</span>
                <span className="font-semibold text-green-400">{selectedRole.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Users to create:</span>
                  <span className="font-semibold text-blue-400">{userCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Usernames:</span>
                  <span className="font-semibold text-purple-400">{previewUsernames}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Password:</span>
                  <span className="font-semibold text-red-400">{password ? '••••••••' : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Emails configured:</span>
                  <span className="font-semibold text-cyan-400">{emails.filter(e => e.trim()).length}/{userCount}</span>
                </div>
                <div className="flex justify-between">
                <span className="text-gray-300">Send emails:</span>
                <span className={`font-semibold ${sendEmails ? 'text-green-400' : 'text-red-400'}`}>
                {sendEmails ? '✓ Yes (via backend)' : '✗ No'}
                </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
                }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !usernamePrefix.trim() || !password.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Creating Users...' : `Create ${userCount} User${userCount > 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BulkUserCreation;
