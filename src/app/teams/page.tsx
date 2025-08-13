/**
 * Teams Page - Role-Based Access Control Implementation
 * 
 * Updated to use the new role-based team view components.
 * Provides different views based on user roles while maintaining
 * backward compatibility with existing functionality.
 * 
 * @author Robotics Tournament Management System
 * @version 1.0.0
 */

"use client";

import { TeamsPageContainer } from "@/components/features/teams/TeamsPageContainer";

export default function TeamsPage() {
  return <TeamsPageContainer />;
}