import { Link, useLocation } from "wouter";
import { Home, Calendar, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmployeeNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Home",
      path: "/employee/dashboard",
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Meetings",
      path: "/employee/meetings",
    },
    {
      icon: <History className="h-5 w-5" />,
      label: "History",
      path: "/employee/history",
    },
    {
      icon: <User className="h-5 w-5" />,
      label: "Profile",
      path: "/employee/profile",
    },
  ];
  
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white shadow-lg border-t border-gray-200">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <a className={cn(
              "flex flex-col items-center p-3",
              location === item.path
                ? "text-primary"
                : "text-muted-foreground"
            )}>
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </nav>
  );
}
