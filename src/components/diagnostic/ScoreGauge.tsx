import React from 'react';
import { motion } from 'framer-motion';

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

export function ScoreGauge({ score, label = 'AI IQ™ Score', size = 200 }: ScoreGaugeProps) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-[#2a3f5f]"
          />
          {/* Score arc */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#00d9ff"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-4xl font-bold text-[#e8eef5] tabular-nums"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {score}
          </motion.span>
        </div>
      </div>
      <span className="text-sm text-[#a0aac0]">{label}</span>
    </div>
  );
}
