import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Crown, User } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { Gender, UserRole } from '@/types/user.types';
import { TeamMemberCardProps } from '../types';
import { ProvinceComboBox } from '@/components/comboboxes/ProvinceComboBox';
import { useAuth } from '@/hooks/common/use-auth';

interface ExtendedTeamMemberCardProps extends TeamMemberCardProps {
  form: UseFormReturn<any>;
}

/**
 * Team Member Card Component
 * Renders individual team member form fields based on profile
 */
export function TeamMemberCard({ 
  index, 
  profile, 
  isLoading = false, 
  canRemove, 
  onRemove,
  form 
}: ExtendedTeamMemberCardProps) {
  const { user } = useAuth();
  const showDetailedFields = profile === 'detailed';
  const isFirstMember = index === 0;
  
  // Determine if this is the current user (team creator)
  const isCurrentUser = isFirstMember && (user?.role === UserRole.COMMON || user?.role === UserRole.TEAM_LEADER);
  
  // Dynamic title based on context
  const getMemberTitle = () => {
    if (isFirstMember) {
      if (isCurrentUser) {
        return 'Team Captain (You)';
      }
      return profile === 'admin' ? 'Captain' : 'Team Captain';
    }
    return `Member ${index + 1}`;
  };

  const memberTitle = getMemberTitle();

  return (
    <Card className={`border-l-4 ${isCurrentUser ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500'}`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">
              {memberTitle}
            </h4>
            {isCurrentUser && (
              <div className="flex items-center gap-1">
                <Crown className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium bg-green-100 px-2 py-1 rounded-full">
                  Team Creator
                </span>
              </div>
            )}
            {isFirstMember && !isCurrentUser && (
              <User className="h-4 w-4 text-blue-600" />
            )}
          </div>
          {canRemove && !isCurrentUser && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Show info message for current user */}
        {isCurrentUser && (
          <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <span className="font-medium">Your information:</span> This information has been automatically filled from your profile. 
              Please review and update any missing details.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Basic Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Full Name */}
            <FormField
              control={form.control}
              name={`teamMembers.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Member name" 
                      disabled={isLoading}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name={`teamMembers.${index}.email`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="member@example.com"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role */}
            <FormField
              control={form.control}
              name={`teamMembers.${index}.role`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Member role"
                      disabled={isLoading || (isFirstMember && profile === 'admin')}
                      {...field}
                      value={isFirstMember && profile === 'admin' ? "Captain" : field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Detailed Fields - Only shown for detailed profile */}
          {showDetailedFields && (
            <>
              {/* Gender and Date of Birth Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.gender`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value ?? ""}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={Gender.MALE}>Male</SelectItem>
                          <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                          <SelectItem value={Gender.OTHER}>Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.dateOfBirth`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Phone Number */}
              <FormField
                control={form.control}
                name={`teamMembers.${index}.phoneNumber`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Phone number"
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.province`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province/City</FormLabel>
                      <FormControl>
                        <ProvinceComboBox 
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.ward`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="District name"
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Organization Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.organization`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School/Organization</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="School or organization name"
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`teamMembers.${index}.organizationAddress`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School/Organization Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Address"
                          disabled={isLoading}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
