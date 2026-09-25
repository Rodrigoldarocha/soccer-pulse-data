import { cn } from "@/lib/utils";

interface FilterPillProps {
  filters: Array<{ id: string; label: string; count?: number; icon?: React.ReactNode }>;
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  className?: string;
}

export function FilterPills({ filters, activeFilter, onFilterChange, className }: FilterPillProps) {
  return (
    <section className={cn("flex items-center gap-space-xs overflow-x-auto pb-1", className)} role="tablist" aria-label="Filtros de partidas ao vivo">
      {filters.map((filter) => (
        <button
          key={filter.id}
          role="tab"
          aria-selected={activeFilter === filter.id}
          aria-controls={`${filter.id}-panel`}
          className={cn(
            "filter-pill",
            activeFilter === filter.id ? "filter-pill-active" : "filter-pill-inactive"
          )}
          onClick={() => onFilterChange(filter.id)}
        >
          {filter.icon && <span aria-hidden="true">{filter.icon}</span>}
          <span>{filter.label}</span>
          {filter.count != null && (
            <span className={cn(
              "px-1.5 py-0.2 rounded-full font-label-xs text-label-xs",
              activeFilter === filter.id
                ? "bg-primary-container text-on-primary"
                : "bg-surface-overlay text-muted-foreground"
            )}>
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </section>
  );
}