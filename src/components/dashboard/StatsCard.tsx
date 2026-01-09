import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

const variantStyles = {
  default: "bg-card border",
  primary: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0",
  success: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0",
  warning: "bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0",
};

const iconStyles = {
  default: "bg-primary/10 text-primary",
  primary: "bg-white/20 text-white",
  success: "bg-white/20 text-white",
  warning: "bg-white/20 text-white",
};

export function StatsCard({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  className,
  variant = "default" 
}: StatsCardProps) {
  return (
    <div className={cn(
      "rounded-xl p-4 md:p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className={cn(
            "text-xs md:text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "text-white/80"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-2xl md:text-3xl font-bold tracking-tight",
            variant === "default" ? "text-foreground" : "text-white"
          )}>
            {value}
          </p>
          {description && (
            <p className={cn(
              "text-xs",
              variant === "default" ? "text-muted-foreground" : "text-white/70"
            )}>
              {description}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              variant === "default" 
                ? trend.isPositive ? "text-emerald-600" : "text-destructive"
                : "text-white/90"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
              <span className={variant === "default" ? "text-muted-foreground" : "text-white/70"}>
                vs last month
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0",
          iconStyles[variant]
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
