
import React from 'react';
import { Button } from '@/components/ui/button';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-black/20"></div>
      
      {/* Animated background elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent leading-tight">
          HEADQUARTERS INC
        </h1>
        
        <p className="text-xl md:text-2xl mb-4 text-blue-100 max-w-4xl mx-auto leading-relaxed">
          Professional Digital Marketing, AI & Automation Agency
        </p>
        
        <p className="text-lg mb-8 text-gray-300 max-w-3xl mx-auto">
          Transforming businesses globally with 21 specialized services and platforms. 
          We deliver measurable results: increased revenue, subscriptions, donations, and customer growth.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg rounded-full transition-all duration-300 transform hover:scale-105"
          >
            Explore Our Services
          </Button>
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('offices')?.scrollIntoView({ behavior: 'smooth' })}
            className="border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white px-8 py-3 text-lg rounded-full transition-all duration-300"
          >
            Global Offices
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
