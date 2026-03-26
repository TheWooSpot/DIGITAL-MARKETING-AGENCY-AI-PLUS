import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { VapiVoiceChat } from '@/components/VapiVoiceChat';
import { Sparkles, Zap, Target, BarChart3 } from 'lucide-react';

const Hero = () => {
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);
  const floatingWords = [
    { text: 'STRATEGY', x: '10%', y: '20%', delay: 0 },
    { text: 'GROWTH', x: '85%', y: '15%', delay: 0.2 },
    { text: 'AI POWERED', x: '15%', y: '70%', delay: 0.4 },
    { text: 'ANALYTICS', x: '80%', y: '75%', delay: 0.6 },
    { text: 'REVENUE', x: '5%', y: '45%', delay: 0.8 },
    { text: 'AUTOMATION', x: '88%', y: '45%', delay: 1.0 },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-colors">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/40 to-pink-300/40 dark:from-purple-900/30 dark:to-pink-900/30 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-300/40 to-cyan-300/40 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating marketing keywords */}
      {floatingWords.map((word, index) => (
        <motion.div
          key={index}
          className="absolute text-xs md:text-sm font-bold text-gray-400/30 dark:text-gray-600/40 pointer-events-none"
          style={{ left: word.x, top: word.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [0.8, 1, 0.8],
            y: [0, -10, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: word.delay,
            ease: "easeInOut"
          }}
        >
          {word.text}
        </motion.div>
      ))}

      {/* Main content - pr-14 reserves space for theme toggle on mobile */}
      <div className="relative z-10 text-center max-w-7xl mx-auto px-4 sm:px-6 pr-14 sm:pr-6 w-full min-w-0">
        {/* Icon badges - smaller on mobile to prevent truncation */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 flex-wrap"
        >
          {[
            { icon: <Sparkles className="w-5 h-5" />, label: 'AI Powered' },
            { icon: <Zap className="w-5 h-5" />, label: 'Fast Results' },
            { icon: <Target className="w-5 h-5" />, label: 'Precision' },
            { icon: <BarChart3 className="w-5 h-5" />, label: 'Data Driven' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full border border-purple-200 dark:border-purple-700 shadow-lg shrink-0"
            >
              <span className="text-purple-600 dark:text-purple-400 shrink-0">{item.icon}</span>
              <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Main heading with staggered animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black mb-6 leading-tight break-words">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
              DIGITAL
            </span>
            <br />
            <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              MARKETING
            </span>
          </h1>
        </motion.div>

        {/* Subheading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-6"
        >
          <h2 className="text-lg sm:text-2xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4 break-words">
            AI+ Digitally Infused, Revenue-Oriented
          </h2>
          <p className="text-base sm:text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed break-words">
            Marketing Agency for{' '}
            <span className="font-bold text-purple-600">Startups</span>,{' '}
            <span className="font-bold text-blue-600">Enterprises</span>,{' '}
            <span className="font-bold text-pink-600">SMBs</span>,{' '}
            and <span className="font-bold text-indigo-600">Non-Profits</span>
          </p>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-sm sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed break-words"
        >
          Transforming businesses with intelligent growth strategies, data-driven insights, 
          and cutting-edge automation that delivers real, measurable results.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 hover:from-purple-700 hover:via-blue-700 hover:to-pink-700 text-white px-10 py-6 text-lg rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 font-bold"
            >
              Explore Our Solutions
            </Button>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="outline"
              onClick={() => setVoiceChatOpen(true)}
              className="border-3 border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-500 hover:text-white hover:border-purple-500 px-10 py-6 text-lg rounded-full shadow-lg transition-all duration-300 font-bold backdrop-blur-sm bg-white/50 dark:bg-gray-800/50"
            >
              Get Started Today
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="outline"
              asChild
              className="border-3 border-teal-400 dark:border-teal-600 text-teal-700 dark:text-teal-300 hover:bg-teal-500 hover:text-white hover:border-teal-500 px-10 py-6 text-lg rounded-full shadow-lg transition-all duration-300 font-bold backdrop-blur-sm bg-white/50 dark:bg-gray-800/50"
            >
              <Link to="/diagnostic">Take AI IQ™ Assessment</Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {[
            { number: '237', label: 'Clients Served' },
            { number: '98%', label: 'Success Rate' },
            { number: '24/7', label: 'AI Support' },
            { number: '$2M+', label: 'Revenue Generated' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -5 }}
              className="glass dark:glass-dark rounded-2xl p-6 border-2 border-white/50 dark:border-gray-700/50 shadow-lg"
            >
              <div className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Voice Chat Sheet — Evaluation Specialist (Jordan); assistant from VITE_VAPI_ASSISTANT_ID or default */}
      <Sheet open={voiceChatOpen} onOpenChange={setVoiceChatOpen}>
        <SheetContent side="bottom" className="h-[70vh] sm:max-w-lg sm:mx-auto sm:rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Talk with Jordan</SheetTitle>
            <SheetDescription className="sr-only">
              Voice chat with our Socialutely Evaluation Specialist (Jordan)
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 h-[calc(100%-4rem)]">
            <VapiVoiceChat onClose={() => setVoiceChatOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-purple-400 dark:border-purple-600 rounded-full flex items-start justify-center p-2">
          <motion.div
            className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
