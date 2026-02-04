import React, { useState } from 'react';
import Hero from '@/components/Hero';
import ServiceCategories from '@/components/ServiceCategories';
import InquiryForm from '@/components/InquiryForm';
import GlobalOffices from '@/components/GlobalOffices';
import { ThemeToggle } from '@/components/ThemeToggle';

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      <ThemeToggle />
      <Hero />
      
      <section id="services">
        <ServiceCategories />
      </section>

      <GlobalOffices />

      <InquiryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        serviceName={selectedService}
      />
    </div>
  );
};

export default Index;
