import BrandMark from './BrandMark';

type BrandLockupProps = {
  markSize?: number;
  titleSize?: 'sm' | 'md' | 'lg';
  className?: string;
  stacked?: boolean;
};

export default function BrandLockup({
  markSize = 52,
  titleSize = 'md',
  className,
  stacked = false,
}: BrandLockupProps) {
  return (
    <div
      className={['medilite-lockup', stacked ? 'medilite-lockup--stacked' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="medilite-lockup-mark" aria-hidden="true">
        <BrandMark size={markSize} />
      </div>
      <div className={`medilite-lockup-copy medilite-lockup-copy--${titleSize}`}>
        <div className="medilite-lockup-title">Medilite AI</div>
        <div className="medilite-lockup-powered">powered by Sarvam AI</div>
      </div>
    </div>
  );
}
