import type { CSSProperties } from 'react';

type BrandLogoProps = {
  height?: number | string;
  style?: CSSProperties;
  className?: string;
};

const BrandLogo = ({ height = 48, style, className }: BrandLogoProps) => (
  <img
    src="/trugo-sync-logo.png"
    alt="Trugo Sync"
    className={className}
    style={{
      height,
      width: 'auto',
      maxWidth: '100%',
      objectFit: 'contain',
      display: 'block',
      ...style,
    }}
  />
);

export default BrandLogo;
