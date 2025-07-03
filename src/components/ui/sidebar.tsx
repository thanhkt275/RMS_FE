"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/common/use-auth";
import { useMobile } from "@/hooks/common/use-mobile";
import { 
  LayoutDashboardIcon, 
  TrophyIcon, 
  UsersIcon, 
  CalendarIcon, 
  ClipboardCheckIcon, 
  SettingsIcon, 
  LogOutIcon, 
  MenuIcon, 
  XIcon 
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isHeadReferee = user?.role === 'HEAD_REFEREE';
  const { isMobile } = useMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Close sidebar when clicking on a link (mobile only)
  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Navigation items
  const navItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Tournaments",
      href: "/tournaments",
      icon: TrophyIcon,
    },
    {
      title: "Schedule",
      href: "/schedule",
      icon: CalendarIcon,
    },
    {
      title: "Results",
      href: "/results",
      icon: ClipboardCheckIcon,
    }
  ];

  // Admin-only navigation items
  const adminNavItems = [
    {
      title: "Users",
      href: "/admin/users",
      icon: UsersIcon,
      adminOnly: true,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: SettingsIcon,
      adminOnly: true,
    }
  ];

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <div className="fixed left-4 top-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className="rounded-full bg-background/80 backdrop-blur-sm"
          >
            {isOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-background transition-transform lg:static lg:translate-x-0",
          isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and title */}
          <div className="border-b px-6 py-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold"
              onClick={handleLinkClick}
            >
              <TrophyIcon className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">Robotics TMS</span>
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                >
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      pathname === item.href
                        ? "bg-accent text-accent-foreground"
                        : "transparent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </span>
                </Link>
              ))}
              
              {/* Admin section */}
              {isAdmin && (
                <>
                  <div className="my-4 border-t pt-4">
                    <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                      Admin
                    </p>
                    {adminNavItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleLinkClick}
                      >
                        <span
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                            pathname === item.href
                              ? "bg-accent text-accent-foreground"
                              : "transparent"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.role.replace("_", " ")}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Logout"
              >
                <LogOutIcon className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
