import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';

const DiagnosticUnlock = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-[#e8eef5]">
      <ThemeToggle />
      <div className="container max-w-xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-[#1a1f2e] border-[#2a3f5f]">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                Unlock Your AI Maturity Blueprint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-[#a0aac0] text-center">
                Access your full diagnostic including governance readiness, team competency
                assessment, risk exposure modeling, and a 90-day activation roadmap.
              </p>
              <div className="space-y-4">
                <div className="border border-[#2a3f5f] rounded-lg p-4">
                  <p className="font-semibold text-[#00d9ff]">Socialutely Circle™</p>
                  <p className="text-sm text-[#a0aac0]">$9-29/mo — Foundational access</p>
                </div>
                <div className="border border-[#2a3f5f] rounded-lg p-4">
                  <p className="font-semibold text-[#00d9ff]">Momentum Vault™</p>
                  <p className="text-sm text-[#a0aac0]">$49-99/mo — Premium resources</p>
                </div>
                <div className="border border-[#2a3f5f] rounded-lg p-4">
                  <p className="font-semibold text-[#00d9ff]">Concierge Access™</p>
                  <p className="text-sm text-[#a0aac0]">$1,000+/mo — Strategic oversight</p>
                </div>
              </div>
              <p className="text-sm text-[#a0aac0] text-center">
                Phase 2: Membership gating and Stripe integration coming soon.
              </p>
              <Button
                variant="outline"
                className="w-full border-[#2a3f5f]"
                onClick={() => navigate('/')}
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default DiagnosticUnlock;
