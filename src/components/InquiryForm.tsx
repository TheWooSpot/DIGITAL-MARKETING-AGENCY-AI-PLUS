
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X } from 'lucide-react';

interface InquiryFormProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
}

const InquiryForm: React.FC<InquiryFormProps> = ({ isOpen, onClose, serviceName }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(10).fill(''));

  const questions = [
    "What is your company name and industry?",
    "What is your current monthly revenue or budget range?",
    "What are your primary business goals for the next 12 months?",
    "Who is your target audience or ideal customer?",
    "What marketing channels are you currently using?",
    "What is your biggest challenge in growing your business?",
    "How many employees does your company have?",
    "What is your preferred timeline for implementing new solutions?",
    "What is your main reason for considering our services?",
    "How did you hear about HEADQUARTERS INC?"
  ];

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Inquiry submitted:', { serviceName, answers });
    alert('Thank you for your inquiry! We will contact you within 24 hours.');
    onClose();
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl">
        <CardHeader className="relative">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <CardTitle className="text-2xl text-center mb-4 dark:text-gray-100">
            Inquiry for {serviceName}
          </CardTitle>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
              {questions[currentQuestion]}
            </h3>
            
            <Textarea
              value={answers[currentQuestion]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Please provide detailed information..."
              className="min-h-32 rounded-lg border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              variant="outline"
              className="px-6"
            >
              Previous
            </Button>
            
            {currentQuestion === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!answers[currentQuestion].trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
              >
                Submit Inquiry
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!answers[currentQuestion].trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6"
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InquiryForm;
