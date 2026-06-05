type MetricCardProps = {
  value: string | number;
  label: string;
  icon: string;
  tone: string;
};

export function MetricCard({ value, label, icon, tone }: MetricCardProps) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <i className={`bi ${icon}`} />
    </div>
  );
}
