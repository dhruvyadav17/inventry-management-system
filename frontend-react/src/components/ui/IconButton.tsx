import type { ButtonHTMLAttributes } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  tone?: 'primary' | 'danger' | 'secondary';
};

export function IconButton({ icon, tone = 'primary', className = '', ...props }: IconButtonProps) {
  return (
    <button className={`btn btn-sm btn-outline-${tone} ${className}`.trim()} {...props}>
      <i className={`bi ${icon}`} />
    </button>
  );
}
