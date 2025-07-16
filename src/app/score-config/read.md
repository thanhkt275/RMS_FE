---

# UI Implementation Plan: Score Configuration Management

## 1. Overview

This document outlines the plan for creating the user interface for managing Score Configurations. The goal is to provide administrators with an intuitive and efficient interface to create, edit, delete, and assign score configurations to various tournaments.

-   **Primary Route:** `/score-config`
-   **User Role:** Admin

## 2. File & Component Structure

The new components will be located within the `RMS_FE` project, following the existing structure.

```
RMS_FE/
└── src/
    ├── app/
    │   └── score-config/
    │       └── page.tsx            # Main page component
    │
    └── components/
        └── features/
            └── score-config/
                ├── ScoreConfigTable.tsx          # Displays list of configs
                ├── ScoreConfigForm.tsx           # Create/Edit form (inside a drawer)
                ├── AssignConfigDialog.tsx        # Modal for assigning configs
                ├── ScoreElementEditor.tsx        # Sub-component for managing elements
                ├── BonusPenaltyEditor.tsx        # Sub-component for bonuses/penalties
                └── index.ts                      # Barrel file for exports
```

## 3. Core Component Breakdown

### A. `ScoreConfigPage` (`/app/score-config/page.tsx`)

This is the main entry point and container for the feature.

-   **Responsibilities:**
    -   Fetch the list of all score configurations using a custom hook.
    -   Manage the state for opening/closing the `ScoreConfigForm` drawer and `AssignConfigDialog`.
    -   Handle user actions (create, edit, delete, assign) by invoking appropriate services or hooks.
    -   Render the main layout, including the header, action buttons, and the `ScoreConfigTable`.
-   **State Management:**
    -   `isFormOpen`: `boolean`
    -   `selectedConfigForEdit`: `ScoreConfig | null`
    -   `isAssignDialogOpen`: `boolean`
    -   `selectedConfigForAssignment`: `ScoreConfig | null`
-   **Hooks:**
    -   `useScoreConfigs()`: To get data.
    -   `useScoreConfigMutations()`: To perform CUD operations.

### B. `ScoreConfigTable.tsx`

Displays the list of score configurations in a data table.

-   **Props:**
    -   `configs: ScoreConfig[]`
    -   `isLoading: boolean`
    -   `onEdit: (config: ScoreConfig) => void`
    -   `onAssign: (config: ScoreConfig) => void`
    -   `onDelete: (configId: string) => void`
-   **Responsibilities:**
    -   Render a table using a UI library component (e.g., ShadCN's Table).
    -   **Columns:** Name, Description, Assigned Tournaments (count), Last Updated, Actions.
    -   The "Actions" column will contain a dropdown menu with "Edit", "Assign", and "Delete" buttons, triggering the callback props.
    -   Display a loading state (e.g., skeleton loaders) when `isLoading` is true.
    -   Display an empty state message if no configurations exist.

### C. `ScoreConfigForm.tsx`

A comprehensive form for creating and editing a score configuration. This component will likely be rendered inside a `Sheet` (drawer) component.

-   **Props:**
    -   `isOpen: boolean`
    -   `onOpenChange: (isOpen: boolean) => void`
    -   `configToEdit?: ScoreConfig | null`
    -   `onSubmit: (data: CreateScoreConfigDto | UpdateScoreConfigDto) => void`
    -   `isSubmitting: boolean`
-   **Responsibilities:**
    -   Use `react-hook-form` and `zod` for robust form management and validation.
    -   Render form fields for `name` and `description`.
    -   Render dynamic, nested forms for:
        -   `ScoreElementEditor` for base scoring elements.
        -   `BonusPenaltyEditor` for bonus and penalty conditions.
    -   Handle both creation (`configToEdit` is null) and editing (`configToEdit` is provided).
    -   The submit button should be disabled when `isSubmitting` is true.

### D. `AssignConfigDialog.tsx`

A modal dialog for assigning a score configuration to one or more tournaments.

-   **Props:**
    -   `isOpen: boolean`
    -   `onOpenChange: (isOpen: boolean) => void`
    -   `config: ScoreConfig`
    -   `onSubmit: (tournamentIds: string[]) => void`
    -   `isSubmitting: boolean`
-   **Responsibilities:**
    -   Fetch a list of all available tournaments (`useTournaments()` hook).
    -   Display the score config name for clarity.
    -   Render a multi-select component (e.g., multi-select combobox or checklist) to choose tournaments.
    -   The initial selection should reflect any tournaments the config is already assigned to.
    -   On submit, call the `onSubmit` prop with an array of selected tournament IDs.

## 4. Data Flow & State Management (using `react-query`)

We will create custom hooks to encapsulate API logic and state management.

-   **`lib/query-keys.ts`**: Add new query keys.
    ```typescript
    export const scoreConfigKeys = {
      all: ['score-configs'] as const,
      detail: (id: string) => [...scoreConfigKeys.all, id] as const,
    };
    ```

-   **`hooks/score-config/useScoreConfigs.ts`**:
    -   Fetches all score configurations (`GET /api/score-config`).
    -   Returns `{ data, isLoading, error }` from `useQuery`.

-   **`hooks/score-config/useScoreConfigMutations.ts`**:
    -   `createMutation`: Uses `useMutation` to handle `POST /api/score-config`. Invalidates `scoreConfigKeys.all` on success.
    -   `updateMutation`: Uses `useMutation` to handle `PATCH /api/score-config/:id`. Invalidates `scoreConfigKeys.all` and `scoreConfigKeys.detail(id)` on success.
    -   `deleteMutation`: Uses `useMutation` to handle `DELETE /api/score-config/:id`. Invalidates `scoreConfigKeys.all` on success.
    -   `assignMutation`: Uses `useMutation` to handle `POST /api/score-config/:id/assign`. Invalidates `scoreConfigKeys.all` on success.

-   **`services/score-config.service.ts`**: A new frontend service file to hold the API call functions (`fetch`, `create`, `update`, etc.).

## 5. API Integration Points

The UI will interact with the following `RMS_BE` API endpoints:

-   `GET /score-config`: Get all score configs.
-   `GET /score-config/:id`: Get full details for one config (for editing).
-   `POST /score-config`: Create a new score config.
-   `PATCH /score-config/:id`: Update an existing score config.
-   `DELETE /score-config/:id`: Delete a score config.
-   `POST /score-config/:id/assign`: Assign a config to a list of tournament IDs.
-   `GET /tournaments`: To get a list of all tournaments for the assignment dialog.

## 6. Step-by-Step Implementation Guide

1.  **[Foundation]** Create the file and folder structure as outlined in section 2.
2.  **[Foundation]** Create the frontend service (`score-config.service.ts`) and the `react-query` hooks (`useScoreConfigs`, `useScoreConfigMutations`).
3.  **[Display]** Build the main `ScoreConfigPage` component. Fetch and log the score configs to ensure the hook is working.
4.  **[Display]** Build the static `ScoreConfigTable` component and pass mock data to it.
5.  **[Integration]** Connect `ScoreConfigPage` and `ScoreConfigTable`, passing the fetched data and loading states. Display skeleton rows during load.
6.  **[Create/Edit Form]** Build the `ScoreConfigForm` component with all its fields, including the nested `ScoreElementEditor` and `BonusPenaltyEditor`. Use a `Sheet` or `Dialog` for display.
7.  **[Create/Edit Logic]** Wire up the "New Score Config" button to open the form. Implement the `createMutation` logic.
8.  **[Create/Edit Logic]** Wire up the "Edit" button on the table to open the form, pre-filled with the selected config's data. Implement the `updateMutation` logic.
9.  **[Assignment]** Build the `AssignConfigDialog` component, including fetching the list of tournaments.
10. **[Assignment Logic]** Wire up the "Assign" button to open the dialog. Implement the `assignMutation` logic.
11. **[Deletion]** Implement the "Delete" button, using an `AlertDialog` for confirmation, and wire it to the `deleteMutation`.
12. **[UX Polish]** Add toasts/notifications for success and error states for all mutations. Ensure all forms have proper validation feedback.
13. **[Testing]** Perform manual testing of the entire user flow.

## 7. UI/UX Refinements

-   **Loading States:** Use skeleton components for the table and spinners on buttons during submission to provide clear feedback.
-   **Empty States:** The `ScoreConfigTable` should display a helpful message with a "Create New Config" button when there is no data.
-   **Error Handling:** Display user-friendly error messages (e.g., using `Alert` components) if API calls fail.
-   **Confirmations:** Use `AlertDialog` for all destructive actions like deletion.
-   **Responsiveness:** Ensure the layout is usable on smaller screens, potentially collapsing some table columns or using a card layout.