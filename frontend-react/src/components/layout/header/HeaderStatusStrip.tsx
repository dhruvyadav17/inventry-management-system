import { HeaderChip } from './HeaderChip';

const statusItems = [
  { icon: 'bi-lightning-charge', label: 'Fast Access', tone: 'blue' as const },
  { icon: 'bi-shield-check', label: 'Secure Admin', tone: 'green' as const },
  { icon: 'bi-clock-history', label: 'Live Monitor', tone: 'slate' as const },
];

export function HeaderStatusStrip() {
  return (
    <div className="header-static" aria-label="Admin status">
      {statusItems.map((item) => (
        <HeaderChip key={item.label} {...item} />
      ))}
    </div>
  );
}
