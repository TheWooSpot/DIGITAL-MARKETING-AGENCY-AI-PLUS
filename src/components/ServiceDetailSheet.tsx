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
  servicesInCategory?: ServiceDetail[];
  onServiceSelect?: (service: ServiceDetail) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceDetailSheet({
  service,
  servicesInCategory = [],
  onServiceSelect,
  open,
  onOpenChange,
}: ServiceDetailSheetProps) {
  if (!service) return null;

  const hasNav = servicesInCategory.length > 1 && onServiceSelect;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'w-full sm:max-w-[75vw] sm:min-w-[480px] overflow-hidden p-0 flex flex-col',
          'glass dark:glass-dark border-l-2 border-white/50 dark:border-gray-700/50',
          'transition-all duration-300 ease-out'
        )}
      >
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left sidebar: service list for same-category navigation */}
          {hasNav && (
            <aside className="w-52 flex-shrink-0 border-r border-white/30 dark:border-gray-600/50 bg-white/30 dark:bg-gray-800/30 overflow-y-auto">
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Services in category
                </p>
                <nav className="space-y-0.5">
                  {servicesInCategory.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onServiceSelect(s)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        s.id === service.id
                          ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4">
        <SheetHeader className="text-left pb-2 border-b border-white/50 dark:border-gray-600/50">
          <SheetTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            {service.name}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {service.tagline}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-3 pl-2 pr-8">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {service.description}
          </p>

          <Accordion type="single" collapsible defaultValue="">
            <AccordionItem value="how-it-works" className="border-0 border-none">
              <AccordionTrigger className="hover:no-underline py-2 text-gray-800 dark:text-gray-100 font-semibold justify-start gap-2 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                How It Works
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 pt-1">
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
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1.5 text-sm">
              Business Impact
            </h4>
            <ul className="space-y-1">
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

          <div className="pt-1">
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
