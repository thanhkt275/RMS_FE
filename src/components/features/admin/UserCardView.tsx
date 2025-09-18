/**
 * UserCardView Component
 * Mobile-optimized card layout for user management
 * Designed for touch interactions and small screens
 */

import React, { useCallback } from 'react';
import { User, UserRole } from '../../../types/user.types';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader } from '../../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Eye, Edit, Trash2, MoreVertical, UserCheck, UserX, Crown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface UserCardViewProps {
  users: User[];
  selectedUsers: string[];
  loading?: boolean;
  onSelectUser: (userId: string) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onViewProfile: (user: User) => void;
  onChangeRole: (user: User) => void;
}

/**
 * Get role color variant for badges
 */
const getRoleVariant = (role: UserRole): "default" | "secondary" | "destructive" | "outline" => {
  switch (role) {
    case UserRole.ADMIN:
      return "destructive";
    case UserRole.HEAD_REFEREE:
      return "default";
    case UserRole.ALLIANCE_REFEREE:
      return "secondary";
    case UserRole.TEAM_LEADER:
      return "outline";
    default:
      return "outline";
  }
};

/**
 * Get role icon
 */
const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return Crown;
    case UserRole.HEAD_REFEREE:
    case UserRole.ALLIANCE_REFEREE:
      return UserCheck;
    default:
      return UserCheck;
  }
};

export const UserCardView: React.FC<UserCardViewProps> = ({
  users,
  selectedUsers,
  loading = false,
  onSelectUser,
  onEdit,
  onDelete,
  onViewProfile,
  onChangeRole,
}) => {
  const handleCardClick = useCallback((e: React.MouseEvent, user: User) => {
    // Prevent card click when clicking on action buttons
    if ((e.target as HTMLElement).closest('[data-action]')) {
      return;
    }
    onSelectUser(user.id);
  }, [onSelectUser]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-gray-200 rounded"></div>
                    <div className="w-24 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-200 rounded"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <UserX className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
        <p className="text-gray-500 mb-6">Try adjusting your search criteria or create a new user.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => {
        const isSelected = selectedUsers.includes(user.id);
        const RoleIcon = getRoleIcon(user.role);
        
        return (
          <Card
            key={user.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]",
              isSelected && "ring-2 ring-blue-500 bg-blue-50"
            )}
            onClick={(e) => handleCardClick(e, user)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                    user.isActive ? "bg-blue-500" : "bg-gray-400"
                  )}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* User Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {user.username}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      data-action="menu"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onViewProfile(user)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeRole(user)}>
                      <Crown className="h-4 w-4 mr-2" />
                      Change Role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(user)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
              {/* Role Badge */}
              <div className="flex items-center justify-between">
                <Badge variant={getRoleVariant(user.role)} className="flex items-center gap-1">
                  <RoleIcon className="w-3 h-3" />
                  {user.role.replace('_', ' ')}
                </Badge>
                
                {/* Status */}
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Contact Info */}
              {user.phoneNumber && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Phone:</span> {user.phoneNumber}
                </div>
              )}

              {/* Created Date */}
              <div className="text-xs text-gray-400">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default UserCardView;
