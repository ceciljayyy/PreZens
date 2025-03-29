import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: "primary" | "success" | "warning" | "destructive" | "secondary";
}

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  // Map color names to tailwind classes
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    secondary: "bg-secondary/10 text-secondary",
  };
  
  return (
    <Card>
      <CardContent className="p-4 flex items-center">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mr-4", colorClasses[color])}>
          {icon}
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
