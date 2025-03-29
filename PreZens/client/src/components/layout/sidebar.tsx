import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  History,
  BarChart,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const menuItems = [
    {
      icon: <LayoutDashboard className="mr-3 h-5 w-5" />,
      label: "Dashboard",
      path: "/admin/dashboard",
    },
    {
      icon: <Calendar className="mr-3 h-5 w-5" />,
      label: "Meetings",
      path: "/admin/meetings",
    },
    {
      icon: <Users className="mr-3 h-5 w-5" />,
      label: "Employees",
      path: "/admin/employees",
    },
    {
      icon: <History className="mr-3 h-5 w-5" />,
      label: "Attendance History",
      path: "/admin/attendance-history",
    },
    {
      icon: <BarChart className="mr-3 h-5 w-5" />,
      label: "Reports",
      path: "/admin/reports",
    },
    {
      icon: <Settings className="mr-3 h-5 w-5" />,
      label: "Settings",
      path: "/admin/settings",
    },
  ];
  
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen lg:sticky top-0">
      <nav className="px-4 py-4">
        <div className="lg:hidden p-4 mb-2 border-b">
          <h2 className="text-xl font-medium text-primary flex items-center">
            Pre<span className="text-secondary">Zens</span>
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">Admin</span>
          </h2>
        </div>
        
        <ul>
          {menuItems.map((item) => (
            <li key={item.path} className="mb-1">
              <Link href={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    location === item.path
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Button>
              </Link>
            </li>
          ))}
          <li className="mt-8">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-gray-100 hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
