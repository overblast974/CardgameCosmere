import type { LinkLevel } from '../types/card';
import { LINK_LEVEL_NAMES } from '../types/card';
import './LinkGauge.css';

interface LinkGaugeProps {
  level: LinkLevel;
}

export function LinkGauge({ level }: LinkGaugeProps) {
  return (
    <div className="link-gauge">
      <div className="link-gauge__pips">
        {([1, 2, 3, 4] as const).map((pip) => (
          <span key={pip} className={`link-gauge__pip${pip <= level ? ' link-gauge__pip--filled' : ''}`} />
        ))}
      </div>
      <span className="link-gauge__label">{LINK_LEVEL_NAMES[level]}</span>
    </div>
  );
}
