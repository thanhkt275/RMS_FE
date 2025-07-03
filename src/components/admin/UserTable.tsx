'use client';

import React from 'react';
import { User, UserRole } from '@/types/user.types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface SortConfig {
  field: keyof User;
  direction: 'asc' | 'desc';
}

interface UserTableProps {
  users: User[];
  selectedUsers: string[];
  sortConfig: SortConfig | null;
  loading: boolean;
  onSelectUser: (userId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onSort: (field: keyof User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onViewProfile: (user: User) => void;
  onChangeRole: (user: User) => void;
}

// Role badge configuration
const ROLE_CONFIG: Record<UserRole, { color: string; label: string }> = {
  [UserRole.ADMIN]: { color: 'bg-red-100 text-red-800', label: 'Admin' },
  [UserRole.HEAD_REFEREE]: { color: 'bg-orange-100 text-orange-800', label: 'Head Referee' },
  [UserRole.ALLIANCE_REFEREE]: { color: 'bg-blue-100 text-blue-800', label: 'Alliance Referee' },
  [UserRole.TEAM_LEADER]: { color: 'bg-green-100 text-green-800', label: 'Team Leader' },
  [UserRole.TEAM_MEMBER]: { color: 'bg-cyan-100 text-cyan-800', label: 'Team Member' },
  [UserRole.COMMON]: { color: 'bg-gray-100 text-gray-800', label: 'Common' },
};

// Table header component
const TableHeaderCell: React.FC<{
  field: keyof User;
  label: string;
  sortConfig: SortConfig | null;
  onSort: (field: keyof User) => void;
  sortable?: boolean;
}> = ({ field, label, sortConfig, onSort, sortable = true }) => {
  const isSorted = sortConfig?.field === field;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <TableHead
      className={cn(
        sortable && 'cursor-pointer hover:bg-gray-50 select-none',
        'font-semibold'
      )}
      onClick={sortable ? () => onSort(field) : undefined}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortable && (
          <span className="ml-1">
            {direction === 'asc' ? '↑' : direction === 'desc' ? '↓' : '↕'}
          </span>
        )}
      </div>
    </TableHead>
  );
};

// User row component
const UserRow: React.FC<{
  user: User;
  isSelected: boolean;
  onSelect: (userId: string) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onViewProfile: (user: User) => void;
  onChangeRole: (user: User) => void;
}> = ({ user, isSelected, onSelect, onEdit, onDelete, onViewProfile, onChangeRole }) => {
  const roleConfig = ROLE_CONFIG[user.role];

  return (
    <TableRow className={cn(isSelected && 'bg-blue-50')}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(user.id)}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium">{user.username}</div>
            {user.email && (
              <div className="text-sm text-gray-500">{user.email}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={roleConfig.color}>
          {roleConfig.label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={user.isActive ? 'default' : 'secondary'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-gray-500">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
      </TableCell>
      <TableCell className="text-sm text-gray-500">
        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewProfile(user)}>
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeRole(user)}>
              <Edit className="h-4 w-4 mr-2" />
              Change Role
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(user)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

// Empty state component
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <TableRow>
    <TableCell colSpan={7} className="text-center py-8">
      <div className="text-gray-500">
        <div className="text-lg font-medium mb-2">No users found</div>
        <div className="text-sm">{message}</div>
      </div>
    </TableCell>
  </TableRow>
);

// Loading state component
const LoadingRows: React.FC = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <TableRow key={index}>
        <TableCell><div className="w-4 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            <div>
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </TableCell>
        <TableCell><div className="w-20 h-6 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell><div className="w-16 h-6 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell><div className="w-8 h-8 bg-gray-200 rounded animate-pulse" /></TableCell>
      </TableRow>
    ))}
  </>
);

// Main UserTable component
export const UserTable: React.FC<UserTableProps> = ({
  users,
  selectedUsers,
  sortConfig,
  loading,
  onSelectUser,
  onSelectAll,
  onSort,
  onEdit,
  onDelete,
  onViewProfile,
  onChangeRole,
}) => {
  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                className={someSelected ? 'data-[state=indeterminate]' : ''}
              />
            </TableHead>
            <TableHeaderCell
              field="username"
              label="User"
              sortConfig={sortConfig}
              onSort={onSort}
            />
            <TableHeaderCell
              field="role"
              label="Role"
              sortConfig={sortConfig}
              onSort={onSort}
            />
            <TableHead>Status</TableHead>
            <TableHeaderCell
              field="createdAt"
              label="Created"
              sortConfig={sortConfig}
              onSort={onSort}
            />
            <TableHead>Last Login</TableHead>
            <TableHead className="w-16">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows />
          ) : users.length === 0 ? (
            <EmptyState message="Try adjusting your search or filter criteria." />
          ) : (
            users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelected={selectedUsers.includes(user.id)}
                onSelect={onSelectUser}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewProfile={onViewProfile}
                onChangeRole={onChangeRole}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
