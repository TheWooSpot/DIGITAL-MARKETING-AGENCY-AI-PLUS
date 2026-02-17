import React from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { TierLevel } from '@/components/TierLevel';
import { Check } from 'lucide-react';
import type { ServiceDetail } from '@/types/services';
import { cn } from '@/lib/utils';

interface ServiceDetailSheetProps {
  service: ServiceDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceDetailSheet({
  service,
  open,
  onOpenChange,
}: ServiceDetailSheetProps) {
  if (!service) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'w-full sm:max-w-[60vw] sm:min-w-[400px] overflow-y-auto',
          'glass dark:glass-dark border-l-2 border-white/50 dark:border-gray-700/50',
          'transition-all duration-300 ease-out'
        )}
      >
        <SheetHeader className="text-left pb-4 border-b border-white/50 dark:border-gray-600/50">
          <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            {service.name}
          </SheetTitle>
          <SheetDescription className="text-base text-muted-foreground">
            {service.tagline}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {service.description}
          </p>

          <Accordion type="single" collapsible defaultValue="">
            <AccordionItem value="how-it-works" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2 text-gray-800 dark:text-gray-100 font-semibold">
                How It Works
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pt-2">
                  {service.howItWorks.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="inline-block w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mt-1.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Business Impact
            </h4>
            <ul className="space-y-2">
              {service.businessImpact.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground italic">
            {service.infrastructure}
          </p>

          <div className="pt-2">
            <TierLevel dots={service.tier} />
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              className="w-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 hover:from-purple-600 hover:via-blue-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
              onClick={() => onOpenChange(false)}
            >
              {service.cta}
            </Button>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
