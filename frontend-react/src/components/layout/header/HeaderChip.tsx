type HeaderChipProps = {
  icon: string;
  label: string;
  tone?: 'blue' | 'green' | 'slate';
};

export function HeaderChip({ icon, label, tone = 'blue' }: HeaderChipProps) {
  return (
    <span className={`header-chip header-chip-${tone}`}>
      <i className={`bi ${icon}`} />
      {label}
    </span>
  );
}
