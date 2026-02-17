import { motion } from 'framer-motion';

interface TierLevelProps {
  dots: 1 | 2 | 3;
}

const TIER_LABELS = ['Essentials', 'Momentum', 'Signature'] as const;

export function TierLevel({ dots }: TierLevelProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground mr-2">
        Available in:
      </span>
      {([1, 2, 3] as const).map((tier) => (
        <motion.span
          key={tier}
          className={`text-sm transition-colors ${
            tier <= dots
              ? 'text-primary'
              : 'text-muted-foreground/50'
          }`}
          whileHover={{ scale: 1.15 }}
          transition={{ duration: 0.2 }}
        >
          {tier <= dots ? '●' : '○'}
        </motion.span>
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {TIER_LABELS[dots - 1]}
      </span>
    </div>
  );
}
