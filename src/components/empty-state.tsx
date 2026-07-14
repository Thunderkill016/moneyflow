"use client";

import { Icon, type IconName } from "@/components/icons";

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryLabel,
  secondaryHref,
  className,
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className ?? ""}`}>
      <span className="empty-state-icon">
        <Icon name={icon} />
      </span>
      <h2 className="empty-state-title">{title}</h2>
      <p className="empty-state-description">{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="empty-state-actions">
          {actionLabel && onAction && (
            <button className="primary-button" onClick={onAction} type="button">
              <Icon name="plus" />
              {actionLabel}
            </button>
          )}
          {actionLabel && actionHref && (
            <a className="primary-button" href={actionHref}>
              <Icon name="plus" />
              {actionLabel}
            </a>
          )}
          {secondaryLabel && secondaryHref && (
            <a className="secondary-button" href={secondaryHref}>
              {secondaryLabel}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
