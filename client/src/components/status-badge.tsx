import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "available" | "occupied" | "reserved" | "checked-in" | "checked-out" | "maintenance";

const statusConfig: Record<Status, { label: string; variant: string; className: string }> = {
  available: {
    label: "Available",
    variant: "outline",
    className: "bg-success/10 text-success border-success/20",
  },
  occupied: {
    label: "Occupied",
    variant: "outline",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  reserved: {
    label: "Reserved",
    variant: "outline",
    className: "bg-accent/10 text-accent border-accent/20",
  },
  "checked-in": {
    label: "Checked In",
    variant: "outline",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  "checked-out": {
    label: "Checked Out",
    variant: "outline",
    className: "bg-muted text-muted-foreground border-border",
  },
  maintenance: {
    label: "Maintenance",
    variant: "outline",
    className: "bg-secondary/10 text-secondary border-secondary/20",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge className={cn(config.className, className)} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
