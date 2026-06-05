import type { Status } from '@common/types';

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-pill status-${status}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}
