/**
 * Legacy standalone AI IQ questionnaire (uses @/lib/diagnostic/questions).
 * Not mounted in App — `/diagnostic` is the URL diagnostic (DoorsUrlDiagnostic).
 * Use `/ai-iq` (AiIqAssessmentPage) for the current AI IQ™ flow.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AI_IQ_QUESTIONS } from '@/lib/diagnostic/questions';
import { calculateAIIQScore } from '@/lib/diagnostic/scoring-engine';
import type { DiagnosticResponse } from '@/lib/diagnostic/types';

const Diagnostic = () => {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingAdvanceRef = useRef(false);
  const advanceTimeoutRef = useRef<number | null>(null);

  const question = AI_IQ_QUESTIONS[currentIndex];
  const progress = ((currentIndex + 1) / AI_IQ_QUESTIONS.length) * 100;

  const handleSelect = (questionId: string, score: number) => {
    setResponses((prev) => {
      if (prev[questionId] === score) return prev;
      pendingAdvanceRef.current = true;
      return { ...prev, [questionId]: score };
    });
  };

  const handleBack = () => {
    pendingAdvanceRef.current = false;
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  useEffect(() => {
    if (!question || !pendingAdvanceRef.current) return;
    if (responses[question.id] === undefined) return;
    pendingAdvanceRef.current = false;
    if (advanceTimeoutRef.current !== null) window.clearTimeout(advanceTimeoutRef.current);
    const snapshot = responses;
    advanceTimeoutRef.current = window.setTimeout(() => {
      advanceTimeoutRef.current = null;
      if (currentIndex < AI_IQ_QUESTIONS.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setIsSubmitting(true);
        const responseArray: DiagnosticResponse[] = Object.entries(snapshot).map(
          ([question_id, response_value]) => ({ question_id, response_value })
        );
        const result = calculateAIIQScore(responseArray);
        navigate("/diagnostic/results", { state: { result } });
      }
    }, 160);
    return () => {
      if (advanceTimeoutRef.current !== null) {
        window.clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
    };
  }, [responses, question, currentIndex, navigate]);

  return (
    <div className="min-h-screen text-[#e8eef5]">
      <ThemeToggle />
      <div className="container max-w-2xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">
            AI IQ™ — How Intelligently Is Your Business Using AI?
          </h1>
          <p className="text-[#a0aac0] text-lg">
            In just a few minutes, discover your AI maturity and how you compare.
          </p>
        </motion.div>

        {/* Progress */}
        <div className="mb-8">
          <div className="h-2 bg-[#1a1f2e] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#00d9ff]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-sm text-[#a0aac0] mt-2">
            Question {currentIndex + 1} of {AI_IQ_QUESTIONS.length}
          </p>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-[#1a1f2e] border-[#2a3f5f]">
              <CardHeader>
                <CardTitle className="text-xl text-[#e8eef5]">
                  {question?.question_text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={responses[question?.id ?? '']?.toString()}
                  onValueChange={(v) => handleSelect(question?.id ?? '', parseInt(v, 10))}
                  className="space-y-4"
                >
                  {question?.options.map((opt) => (
                    <div
                      key={opt.score}
                      className="flex items-center space-x-3 rounded-lg border border-[#2a3f5f] p-4 hover:border-[#00d9ff]/50 transition-colors"
                    >
                      <RadioGroupItem
                        value={opt.score.toString()}
                        id={`${question?.id}-${opt.score}`}
                      />
                      <Label
                        htmlFor={`${question?.id}-${opt.score}`}
                        className="flex-1 cursor-pointer text-[#e8eef5]"
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentIndex === 0 || isSubmitting}
            className="border-[#2a3f5f] text-[#e8eef5] hover:bg-[#1a1f2e]"
          >
            Back
          </Button>
          <p className="text-center text-sm text-[#a0aac0] sm:text-right">Select an answer to continue.</p>
        </div>
      </div>
    </div>
  );
};

export default Diagnostic;
