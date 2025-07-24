"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/common/use-auth";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/types";

// Define navigation items with role requirements
const navigationItems = [
  { name: "Audience Display", href: "/audience-display", roles: [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER, UserRole.COMMON] },
  { name: "Teams", href: "/teams", roles: [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER, UserRole.COMMON] },
  { name: "Matches", href: "/matches", roles: [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE, UserRole.TEAM_LEADER, UserRole.TEAM_MEMBER, UserRole.COMMON] },
  { name: "Control Match", href: "/control-match", roles: [UserRole.ADMIN, UserRole.HEAD_REFEREE, UserRole.ALLIANCE_REFEREE] },
  { name: "Tournaments", href: "/tournaments", roles: [UserRole.ADMIN, UserRole.COMMON] },
  { name: "Stages", href: "/stages", roles: [UserRole.ADMIN] },
  { name: "Users", href: "/users", roles: [UserRole.ADMIN] },
];

// Function to filter navigation items based on user role
const getFilteredNavigationItems = (userRole: UserRole | null) => {
  if (!userRole) {
    // Not signed in - show only basic items
    return navigationItems.filter(item => 
      item.roles.includes(UserRole.COMMON)
    );
  }
  
  return navigationItems.filter(item => 
    item.roles.includes(userRole)
  );
};

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Only show user-dependent UI after hydration to avoid mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Reset the logging out state after successful logout
      // Note: This might not execute if redirect happens immediately
      setIsLoggingOut(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Reset loading state if logout fails
      setIsLoggingOut(false);
    }
  };

  // Reset logout state when user changes (e.g., after login or logout completion)
  useEffect(() => {
    if (user && isLoggingOut) {
      // User is now present, so reset logout state
      setIsLoggingOut(false);
    } else if (!user && !isLoading && isLoggingOut) {
      // User is null and not loading, logout is complete
      setIsLoggingOut(false);
    }
  }, [user, isLoading, isLoggingOut]);

  // Reset logout state when pathname changes (navigation)
  useEffect(() => {
    if (isLoggingOut && pathname !== '/login') {
      setIsLoggingOut(false);
    }
  }, [pathname, isLoggingOut]);

  // Get filtered navigation items based on user role
  const filteredNavigationItems = getFilteredNavigationItems(user?.role || null);

  return (
    <nav className="bg-background border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-xl text-primary truncate">RBA</span>
              <span className="hidden md:block text-lg truncate">Robotics Tournament Manager</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center space-x-2 xl:space-x-4">
              {filteredNavigationItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:bg-accent hover:text-foreground"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop Auth */}
          <div className="hidden lg:flex items-center space-x-4 min-w-[180px] justify-end">
            {isMounted ? (
              user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground truncate max-w-[100px]">{user?.username}</span>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="px-3 py-1.5 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1.5 border border-primary/30 text-primary hover:bg-primary/10 rounded text-sm font-medium transition-colors"
                >
                  Sign in
                </Link>
              )
            ) : (
              <div className="w-[120px] h-[32px] bg-accent/10 rounded animate-pulse" />
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <MobileMenu
              navigationItems={filteredNavigationItems}
              pathname={pathname}
              user={isMounted ? user : null}
              logout={handleLogout}
              isMounted={isMounted}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({ navigationItems, pathname, user, logout, isMounted, isLoggingOut }: {
  navigationItems: { name: string; href: string; roles: UserRole[] }[];
  pathname: string | null;
  user: any;
  logout: () => Promise<void>;
  isMounted: boolean;
  isLoggingOut: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
      >
        <span className="sr-only">Open main menu</span>
        {/* Menu icon */}
        <svg
          className={`${isOpen ? "hidden" : "block"} h-6 w-6`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {/* X icon */}
        <svg
          className={`${isOpen ? "block" : "hidden"} h-6 w-6`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200",
          isOpen ? "block" : "hidden"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile menu */}
      {isOpen && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-lg animate-slide-down">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-accent hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-4 pb-3 border-t border-accent/20">
              {isMounted ? (
                user ? (
                  <>
                    <div className="px-3 py-2 text-base font-medium text-foreground truncate">{user.username}</div>
                    <button
                      onClick={async () => {
                        await logout();
                        setIsOpen(false);
                      }}
                      disabled={isLoggingOut}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign in
                  </Link>
                )
              ) : (
                <div className="h-[40px]" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}