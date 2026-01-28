import React, { useState } from 'react';
import Hero from '@/components/Hero';
import ServiceCategories from '@/components/ServiceCategories';
import InquiryForm from '@/components/InquiryForm';
import GlobalOffices from '@/components/GlobalOffices';

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
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
