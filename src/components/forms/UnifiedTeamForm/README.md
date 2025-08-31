# Unified Team Registration Form

## Overview

This is a unified team registration form system that consolidates the previous two separate forms into a single, flexible component. The form adapts its complexity and validation based on user context and requirements.

## ✨ Key Features

- **🎯 Profile-Based Forms**: Adaptive UI based on user context (Admin, Detailed, Simple, Adaptive)
- **📝 Dynamic Validation**: Context-aware validation rules using Zod schemas
- **🔄 Mode Support**: Create and Edit modes with appropriate data handling
- **🛡️ Team Limit Validation**: Automatic tournament capacity checking and warnings
- **♿ Accessibility**: ARIA compliance and keyboard navigation
- **📱 Responsive**: Mobile-first design with progressive enhancement
- **⚡ Performance**: Optimized bundle size and efficient rendering
- **🧪 Type Safe**: Full TypeScript coverage with comprehensive interfaces

## Folder Structure

```
UnifiedTeamForm/
├── index.tsx                    # Main form component
├── types.ts                     # TypeScript interfaces and types
├── components/                  # UI components
│   ├── index.ts                 # Component exports
│   ├── TeamInfoSection.tsx      # Team basic information
│   ├── TeamMemberSection.tsx    # Team members management
│   ├── TeamMemberCard.tsx       # Individual member form
│   ├── DetailedFormSection.tsx  # Additional detailed fields
│   ├── FormModeToggle.tsx       # Admin mode switcher
│   └── FormActions.tsx          # Submit/cancel buttons
├── hooks/                       # Custom hooks
│   ├── index.ts                 # Hook exports
│   ├── useFormProfile.ts        # Profile detection logic
│   ├── useTeamFormValidation.ts # Dynamic validation
│   └── useTeamFormSubmission.ts # Form submission handling
└── schemas/                     # Validation schemas
    ├── index.ts                 # Schema exports
    ├── baseSchemas.ts           # Core validation rules
    └── schemaFactory.ts         # Dynamic schema creation
```

## Form Profiles

### Simple Mode
- Basic team information (name)
- Simple member fields (name, email, role)
- Minimal validation

### Detailed Mode
- Full team information
- Comprehensive member details (age, location, organization)
- Age validation (10-18 years)
- Terms acceptance required

### Admin Mode
- Streamlined interface for admin users
- Team number field
- Quick entry capabilities
- Simplified validation

### Adaptive Mode
- Automatically determines profile based on context
- User role and tournament settings

## Usage Examples

### Basic Usage
```tsx
import { UnifiedTeamForm } from '@/components/forms/UnifiedTeamForm';

// Auto-detect profile based on context
<UnifiedTeamForm 
  tournament={tournament}
  onSuccess={(data) => console.log('Team registered:', data)}
/>
```

### Admin Quick Entry
```tsx
<UnifiedTeamForm 
  profile="admin"
  tournament={tournament}
  showModeToggle={true}
  onSuccess={() => router.push('/admin/teams')}
/>
```

### Edit Existing Team
```tsx
<UnifiedTeamForm 
  mode="edit"
  defaultValues={existingTeamData}
  profile="detailed"
  onSuccess={() => router.push('/teams')}
/>
```

### Custom Submission Handler
```tsx
<UnifiedTeamForm 
  profile="simple"
  onSubmit={async (data) => {
    // Custom submission logic
    await customApiCall(data);
  }}
/>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `profile` | `FormProfile` | `'adaptive'` | Form complexity profile |
| `mode` | `FormMode` | `'create'` | Create or edit mode |
| `tournament` | `Tournament` | - | Tournament context |
| `defaultValues` | `TeamFormData` | - | Initial form values |
| `maxTeamMembers` | `number` | - | Maximum members allowed |
| `onSuccess` | `(data) => void` | - | Success callback |
| `onCancel` | `() => void` | - | Cancel callback |
| `onSubmit` | `(data) => Promise<void>` | - | Custom submit handler |
| `showModeToggle` | `boolean` | `false` | Show admin mode toggle |
| `className` | `string` | `''` | Additional CSS classes |

## Migration Notes

This form replaces:
- `/app/tournaments/[id]/teams/register/page.tsx` (Admin form)
- `/components/forms/TeamForm.tsx` (Detailed form)

To migrate existing usage:
1. Replace imports to use `UnifiedTeamForm`
2. Update props to match new interface
3. Test all user scenarios
4. Remove old form files after verification

## Validation Rules

### Base Validation (All Profiles)
- Team name: 2-100 characters, required
- At least one team member required
- Member name: required

### Detailed Profile Additional Rules
- Age validation: 10-18 years
- Province/ward: required
- Terms acceptance: required
- Email format validation

### Admin Profile Rules
- Team number: positive integer, required
- Simplified member validation
- Optional detailed fields

## Performance Considerations

- Dynamic schema creation is memoized
- Profile detection cached based on dependencies
- Form validation runs only on relevant fields
- Components are lazy-loaded where possible

## Testing

Test cases should cover:
- All form profiles (simple, detailed, admin, adaptive)
- Profile switching for admin users
- Validation edge cases
- Form submission and error handling
- Accessibility compliance
- Mobile responsiveness
