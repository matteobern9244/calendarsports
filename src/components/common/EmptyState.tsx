import { CalendarX } from "lucide-react";

interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({ message = "Nessun evento disponibile" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <CalendarX className="h-10 w-10" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
