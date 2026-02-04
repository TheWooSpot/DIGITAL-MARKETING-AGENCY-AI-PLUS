
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ServicePanelProps {
  title: string;
  description: string;
  color: string;
  onLearnMore: () => void;
}

const ServicePanel: React.FC<ServicePanelProps> = ({ title, description, color, onLearnMore }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative h-80 rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 transform hover:scale-105 hover:shadow-2xl ${color}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5"></div>
      
      <div className="relative h-full p-6 flex flex-col justify-between text-white">
        <div>
          <h3 className="text-xl font-bold mb-3 leading-tight">{title}</h3>
        </div>
        
        <div className={`transition-all duration-500 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-sm mb-4 leading-relaxed">{description}</p>
          <Button
            onClick={onLearnMore}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-full px-6 py-2 text-sm transition-all duration-300"
          >
            Learn More
          </Button>
        </div>
        
        <div className={`absolute inset-0 bg-black/20 dark:bg-black/40 transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>
    </div>
  );
};

export default ServicePanel;
