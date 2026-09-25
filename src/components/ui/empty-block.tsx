import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface EmptyBlockProps {
  title: string;
  body: string;
  linkTo?: string;
  linkLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyBlock({ title, body, linkTo, linkLabel, icon, className }: EmptyBlockProps) {
  return (
    <div className={cn("empty-block", className)}>
      {icon && <div className="mb-2 text-primary">{icon}</div>}
      <p className="empty-title">{title}</p>
      <p className="empty-body">{body}</p>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="empty-link">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}