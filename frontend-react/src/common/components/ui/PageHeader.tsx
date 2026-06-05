import type { ReactNode } from 'react';

export function PageHeader({ title, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="page-title-row">
      <div>
        <h1 className="page-title">{title}</h1>
      </div>
      {action}
    </div>
  );
}
