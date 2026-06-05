import type { ReactNode } from 'react';

type PanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function Panel({ title, subtitle, children, className = '', bodyClassName }: PanelProps) {
  return (
    <div className={`card panel-card ${className}`.trim()}>
      <div className="card-header">
        <h3>{title}</h3>
        {subtitle && <span>{subtitle}</span>}
      </div>
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </div>
  );
}
