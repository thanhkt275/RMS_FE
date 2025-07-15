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
  [UserRole.ADMIN]: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Admin' },
  [UserRole.HEAD_REFEREE]: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Head Referee' },
  [UserRole.ALLIANCE_REFEREE]: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Alliance Referee' },
  [UserRole.TEAM_LEADER]: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Team Leader' },
  [UserRole.TEAM_MEMBER]: { color: 'bg-cyan-100 text-cyan-800 border-cyan-200', label: 'Team Member' },
  [UserRole.COMMON]: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Common' },
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
        sortable && 'cursor-pointer hover:bg-gray-50 select-none transition-colors duration-200',
        'font-semibold text-gray-900 bg-gray-50'
      )}
      onClick={sortable ? () => onSort(field) : undefined}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortable && (
          <span className="ml-1 text-gray-500">
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
    <TableRow className={cn(
      isSelected && 'bg-blue-50 border-blue-200',
      'hover:bg-gray-50 transition-colors duration-200 border-b border-gray-200'
    )}>
      <TableCell className="py-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(user.id)}
        />
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold text-sm">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{user.username}</div>
            {user.email && (
              <div className="text-sm text-gray-600">{user.email}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Badge className={cn(roleConfig.color, 'border font-medium')}>
          {roleConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="py-4">
        <Badge 
          variant={user.isActive ? 'default' : 'secondary'}
          className={cn(
            user.isActive 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-gray-100 text-gray-600 border-gray-200',
            'border font-medium'
          )}
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-gray-600 py-4">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
      </TableCell>
      <TableCell className="text-sm text-gray-600 py-4">
        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
      </TableCell>
      <TableCell className="py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
              <MoreHorizontal className="h-4 w-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg">
            <DropdownMenuItem onClick={() => onViewProfile(user)} className="hover:bg-gray-50">
              <Eye className="h-4 w-4 mr-2 text-gray-600" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(user)} className="hover:bg-gray-50">
              <Edit className="h-4 w-4 mr-2 text-gray-600" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeRole(user)} className="hover:bg-gray-50">
              <Edit className="h-4 w-4 mr-2 text-gray-600" />
              Change Role
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(user)}
              className="text-red-600 hover:bg-red-50"
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
    <TableCell colSpan={7} className="text-center py-12">
      <div className="text-gray-500">
        <div className="text-lg font-semibold mb-2 text-gray-700">No users found</div>
        <div className="text-sm">{message}</div>
      </div>
    </TableCell>
  </TableRow>
);

// Loading state component
const LoadingRows: React.FC = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <TableRow key={index} className="border-b border-gray-200">
        <TableCell className="py-4"><div className="w-4 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell className="py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div>
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4"><div className="w-20 h-6 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell className="py-4"><div className="w-16 h-6 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell className="py-4"><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell className="py-4"><div className="w-20 h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
        <TableCell className="py-4"><div className="w-8 h-8 bg-gray-200 rounded animate-pulse" /></TableCell>
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
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 border-b border-gray-200">
            <TableHead className="w-12 bg-gray-50">
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
            <TableHead className="font-semibold text-gray-900 bg-gray-50">Status</TableHead>
            <TableHeaderCell
              field="createdAt"
              label="Created"
              sortConfig={sortConfig}
              onSort={onSort}
            />
            <TableHead className="font-semibold text-gray-900 bg-gray-50">Last Login</TableHead>
            <TableHead className="w-16 bg-gray-50">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white">
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
