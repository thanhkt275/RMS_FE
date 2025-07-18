"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/types/user.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Gender } from "@/types/user.types";

// Types
interface UserFormProps {
  user?: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  loading?: boolean;
}

interface FormData {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  isActive: boolean;
  phoneNumber: string;
  gender: Gender | null; // Fixed: Changed from Gender to Gender | null
  DateOfBirth: string | null;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  general?: string;
}

// Constants
const ROLE_OPTIONS = [
  { value: UserRole.ADMIN, label: "Admin" },
  { value: UserRole.HEAD_REFEREE, label: "Head Referee" },
  { value: UserRole.ALLIANCE_REFEREE, label: "Alliance Referee" },
  { value: UserRole.TEAM_LEADER, label: "Team Leader" },
  { value: UserRole.TEAM_MEMBER, label: "Team Member" },
  { value: UserRole.COMMON, label: "Common" },
];

// Utility functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  return errors;
};

// Form field components
const FormField: React.FC<{
  id: string;
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}> = ({ id, label, children, error, required = false }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-sm font-medium">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    {children}
    {error && (
      <div className="text-red-500 text-sm flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {error}
      </div>
    )}
  </div>
);

const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
}> = ({ id, label, value, onChange, error, placeholder, required = false }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField id={id} label={label} error={error} required={required}>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={error ? "border-red-500" : ""}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
        </Button>
      </div>
    </FormField>
  );
};

// Main UserForm component
export const UserForm: React.FC<UserFormProps> = ({
  user,
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const isEditMode = !!user;

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: UserRole.COMMON,
    isActive: true,
    phoneNumber: "",
    gender: null,
    DateOfBirth: null,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        username: user.username,
        email: user.email || "",
        password: "",
        confirmPassword: "",
        role: user.role,
        isActive: user.isActive,
        phoneNumber: user.phoneNumber || "",
        gender: user.gender ?? null,
        DateOfBirth: user.DateOfBirth
          ? new Date(user.DateOfBirth).toISOString().split("T")[0]
          : null,
      });
    } else {
      setFormData({
        name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: UserRole.COMMON,
        isActive: true,
        phoneNumber: "",
        gender: null,
        DateOfBirth: null,
      });
    }
    setErrors({});
    setSubmitAttempted(false);
  }, [user, isOpen]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username =
        "Username can only contain letters, numbers, and underscores";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation (only for create mode or when password is provided)
    if (!isEditMode || formData.password) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else {
        const passwordErrors = validatePassword(formData.password);
        if (passwordErrors.length > 0) {
          newErrors.password = passwordErrors[0]; // Show first error
        }
      }

      // Confirm password validation
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validateForm()) {
      return;
    }
    try {
      setErrors({});
      if (isEditMode) {
        // Only include email if it was changed from the original user value
        const updateData: UpdateUserRequest = {
          username: formData.username,
          role: formData.role,
          phoneNumber: formData.phoneNumber,
          gender: formData.gender ?? undefined,
          DateOfBirth: formData.DateOfBirth
            ? new Date(formData.DateOfBirth)
            : undefined,
          isActive: formData.isActive,
          ...(formData.password && { password: formData.password }),
        };
        if (user && formData.email !== (user.email || "")) {
          updateData.email = formData.email;
        }
        await onSubmit(updateData);
      } else {
        const createData: CreateUserRequest = {
          name: formData.username,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phoneNumber: formData.phoneNumber,
          gender: formData.gender ?? undefined,
          DateOfBirth: formData.DateOfBirth
            ? new Date(formData.DateOfBirth)
            : undefined,
        };
        await onSubmit(createData);
      }
      onClose();
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "An error occurred while saving the user",
      });
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit User" : "Create New User"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                id="username"
                label="Username"
                error={errors.username}
                required
              >
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  placeholder="Enter username"
                  className={errors.username ? "border-red-500" : ""}
                />
              </FormField>
              <FormField id="email" label="Email" error={errors.email} required>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter email address"
                  className={errors.email ? "border-red-500" : ""}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PasswordField
                id="password"
                label={isEditMode ? "New Password (optional)" : "Password"}
                value={formData.password}
                onChange={(value) => handleInputChange("password", value)}
                error={errors.password}
                placeholder={
                  isEditMode ? "Leave blank to keep current" : "Enter password"
                }
                required={!isEditMode}
              />
              <PasswordField
                id="confirmPassword"
                label="Confirm Password"
                value={formData.confirmPassword}
                onChange={(value) =>
                  handleInputChange("confirmPassword", value)
                }
                error={errors.confirmPassword}
                placeholder="Confirm password"
                required={!isEditMode || !!formData.password}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="phoneNumber" label="Phone Number">
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  placeholder="Enter phone number"
                />
              </FormField>
              <FormField id="gender" label="Gender">
                {/* FIXED: Gender Select Component */}
                <Select
                  value={formData.gender || "not-specified"}
                  onValueChange={(value) =>
                    handleInputChange(
                      "gender",
                      value === "not-specified" ? null : (value as Gender)
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-specified">Not specified</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <FormField id="DateOfBirth" label="Date of Birth">
              <Input
                id="DateOfBirth"
                type="date"
                value={formData.DateOfBirth || ""}
                onChange={(e) =>
                  handleInputChange("DateOfBirth", e.target.value || null)
                }
              />
            </FormField>
          </div>

          {/* Role and Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Role and Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="role" label="Role" error={errors.role} required>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    handleInputChange("role", value as UserRole)
                  }
                >
                  <SelectTrigger
                    className={errors.role ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      handleInputChange("isActive", checked)
                    }
                  />
                  <Label htmlFor="isActive" className="text-sm">
                    {formData.isActive ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditMode
                ? "Update User"
                : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserForm;
