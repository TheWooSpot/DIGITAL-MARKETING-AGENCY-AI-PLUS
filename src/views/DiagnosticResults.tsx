import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ScoreGauge } from '@/components/diagnostic/ScoreGauge';
import { getRecommendations } from '@/lib/diagnostic/routing-engine';
import type { ScoreResult } from '@/lib/diagnostic/types';

const DiagnosticResults = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result as ScoreResult | undefined;
  const routing = result ? getRecommendations(result.ai_iq_score) : null;

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#a0aac0] mb-4">No results found. Take the assessment first.</p>
          <Button onClick={() => navigate('/diagnostic')} className="bg-[#00d9ff] text-[#0a0e1a]">
            Take Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#e8eef5]">
      <ThemeToggle />
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Score card */}
          <Card className="bg-[#1a1f2e] border-[#2a3f5f] mb-8">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center">
                <ScoreGauge score={result.ai_iq_score} />
                <motion.p
                  className="mt-4 text-2xl font-semibold text-[#00d9ff]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {result.maturity_band}
                </motion.p>
              </div>
            </CardContent>
          </Card>

          {/* Narrative */}
          <Card className="bg-[#1a1f2e] border-[#2a3f5f] mb-6">
            <CardContent className="pt-6">
              <p className="text-[#e8eef5] leading-relaxed">{result.narrative}</p>
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card className="bg-[#1a1f2e] border-[#2a3f5f] mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-[#10b981]">Your Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-center gap-2 text-[#e8eef5]"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                  >
                    <span className="text-[#10b981]">•</span> {s}
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Blind spots */}
          <Card className="bg-[#1a1f2e] border-[#2a3f5f] mb-8">
            <CardHeader>
              <CardTitle className="text-lg text-[#f59e0b]">Blind Spots</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.blind_spots.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-center gap-2 text-[#e8eef5]"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                  >
                    <span className="text-[#f59e0b]">•</span> {s}
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommended tier & membership */}
          {routing && (
            <Card className="bg-[#1a1f2e] border-[#2a3f5f] mb-6">
              <CardHeader>
                <CardTitle className="text-lg text-[#00d9ff]">Recommended for you</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#e8eef5] font-medium">
                  {routing.recommendedTier} · {routing.recommendedMembership}
                </p>
                <p className="text-sm text-[#a0aac0] mt-1">
                  Based on your AI IQ score, we recommend this tier to get the most value.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recommended services */}
          {routing && routing.recommendedServices.length > 0 && (
            <Card className="bg-[#1a1f2e] border-[#2a3f5f] mb-8">
              <CardHeader>
                <CardTitle className="text-lg text-[#10b981]">Socialutely services that fit</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {routing.recommendedServices.map((svc, i) => (
                    <motion.li
                      key={svc.id}
                      className="flex flex-col gap-0.5 text-[#e8eef5]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 + i * 0.08 }}
                    >
                      <span className="font-medium text-[#00d9ff]">{svc.name}</span>
                      <span className="text-sm text-[#a0aac0]">{svc.rationale}</span>
                    </motion.li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="mt-4 border-[#2a3f5f] text-[#00d9ff] hover:bg-[#00d9ff]/10"
                  onClick={() => navigate('/')}
                >
                  Explore full service catalog
                </Button>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Button
              size="lg"
              className="bg-[#00d9ff] text-[#0a0e1a] hover:bg-[#00d9ff]/90 text-lg px-8"
              onClick={() => navigate('/diagnostic/unlock')}
            >
              Unlock Full AI Maturity Report
            </Button>
            <p className="text-sm text-[#a0aac0] mt-4">
              Access governance readiness, competency assessment, and 90-day roadmap
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default DiagnosticResults;
