
import React, { useState } from 'react';
import Hero from '@/components/Hero';
import ServicePanel from '@/components/ServicePanel';
import InquiryForm from '@/components/InquiryForm';
import GlobalOffices from '@/components/GlobalOffices';

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  const services = [
    {
      title: "uRANK - Pay Per Result SEO",
      description: "We'll get you on the 1st page of Google, or you don't pay a dime! Results-driven SEO with guaranteed rankings.",
      color: "bg-gradient-to-br from-orange-500 to-red-500"
    },
    {
      title: "A1 Video Bots Concierge", 
      description: "Interactive AI Video or Chat Bot AI AGENT for an engaging Client Journey management platform.",
      color: "bg-gradient-to-br from-purple-500 to-indigo-500"
    },
    {
      title: "uEverywhere - Business Listings",
      description: "Help clients with effective business listings, a critical channel for bringing in business across all platforms.",
      color: "bg-gradient-to-br from-blue-500 to-cyan-500"
    },
    {
      title: "uEqual - Website Accessibility",
      description: "Protect clients from legal violations, lawsuits and thousands of dollars in fines with comprehensive accessibility solutions.",
      color: "bg-gradient-to-br from-teal-500 to-green-500"
    },
    {
      title: "uVAAP - Alexa & Google Business Voice Bots",
      description: "Voice search is now mainstream. If your clients' websites are not optimized for voice search, they are losing business.",
      color: "bg-gradient-to-br from-lime-500 to-yellow-500"
    },
    {
      title: "uLinkedIn - LinkedIn Marketing Technology",
      description: "We'll systematically scale your prospecting power of LinkedIn to generate consistent leads and business growth.",
      color: "bg-gradient-to-br from-amber-500 to-orange-500"
    },
    {
      title: "Innovation Grant - By Google",
      description: "Help businesses get approved for a Lifetime of Free Advertising Dollars to increase brand exposure, goodwill & overall margins.",
      color: "bg-gradient-to-br from-red-500 to-pink-500"
    },
    {
      title: "Evergreen Fundraising - Automated Triple Bottom Line",
      description: "Provide clients with automated, web-based, streamlined expense reduction, revenue generating donation engine and teams.",
      color: "bg-gradient-to-br from-violet-500 to-purple-500"
    },
    {
      title: "AppsieDaisie - Mobile App Development",
      description: "Provide clients with Full Scale Mobile App support functions like loyalty programs, coupons, shopping cart, push notifications, customer support, and more.",
      color: "bg-gradient-to-br from-indigo-500 to-blue-500"
    },
    {
      title: "uFinance - Up to $500,000 Loan/Line of Credit",
      description: "Help any business finance their growth and pay for your marketing services with accessible funding solutions.",
      color: "bg-gradient-to-br from-cyan-500 to-teal-500"
    },
    {
      title: "uCARD - Pay Per Revenue Cash Back Promotions",
      description: "We'll advertise the business for free to 100 million consumers. The business only pays a small commission on each paying customer. 5x ROI guaranteed! Cloud Based Loyalty Rewards Management & Engagement Platform.",
      color: "bg-gradient-to-br from-yellow-500 to-lime-500"
    },
    {
      title: "uBOS - All in One Business Operating System",
      description: "We'll provision your organization with a centralized platform to maintain your email, text, chat, payment gateways and invoices, appointment booking and reminders, client/member profile dashboard, automate engagement offers, birthdays, no-shows, thank you, review requests plus access to a variety of marketing platforms to attract and scale every nook and cranny of your organization.",
      color: "bg-gradient-to-br from-green-500 to-emerald-500"
    },
    {
      title: "uFB - Facebook Advertising with Guaranteed Results",
      description: "We can run campaigns with guaranteed reach and frequency for a business as low as $300 per month. We have a special formula that gets results!",
      color: "bg-gradient-to-br from-blue-600 to-indigo-600"
    },
    {
      title: "uSTAR - Review Generation & Reputation Management",
      description: "We'll generate high-ranking reviews for your client – guaranteed! Comprehensive reputation management solutions.",
      color: "bg-gradient-to-br from-purple-600 to-violet-600"
    },
    {
      title: "uBLAST - Promote Any Offer to a 150 million Person Opt-In List",
      description: "We'll promote any offer to a 150 million person opt-in list with 700 targeting parameters for maximum reach and engagement.",
      color: "bg-gradient-to-br from-pink-500 to-rose-500"
    },
    {
      title: "uSuperbots - AI Super Chat Bots",
      description: "Increase conversions by 2X to 4X with our 24/7 AI Chat Bot or don't pay! Advanced conversational AI technology.",
      color: "bg-gradient-to-br from-orange-600 to-red-600"
    },
    {
      title: "uSEM - Google Advertising",
      description: "Search page results ads, Google display network ads and even Google shopping ads for comprehensive search marketing.",
      color: "bg-gradient-to-br from-amber-600 to-yellow-600"
    },
    {
      title: "uWEBSITES - Amazing Websites at Enticing Prices",
      description: "Beautiful, high-converting website design and development for any budget with modern responsive layouts.",
      color: "bg-gradient-to-br from-lime-600 to-green-600"
    },
    {
      title: "uSOCIAL - Social Media Management",
      description: "Complete social media management including content creation, posting, engagement, and community building across all platforms.",
      color: "bg-gradient-to-br from-emerald-600 to-teal-600"
    },
    {
      title: "uEMAIL - Email Marketing Automation",
      description: "Sophisticated email marketing campaigns with automation, segmentation, and personalization to nurture leads and retain customers.",
      color: "bg-gradient-to-br from-cyan-600 to-blue-600"
    },
    {
      title: "uANALYTICS - Business Intelligence & Reporting",
      description: "Comprehensive analytics and reporting dashboards to track ROI, customer behavior, and business performance across all channels.",
      color: "bg-gradient-to-br from-slate-600 to-gray-600"
    }
  ];

  const handleLearnMore = (serviceName: string) => {
    setSelectedService(serviceName);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen">
      <Hero />
      
      <section id="services" className="py-20 bg-gradient-to-br from-gray-900 via-slate-800 to-blue-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Our Services & Platforms
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              21 comprehensive solutions designed to drive measurable growth for your business. 
              Hover over each service to learn more and start your journey to success.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <ServicePanel
                key={index}
                title={service.title}
                description={service.description}
                color={service.color}
                onLearnMore={() => handleLearnMore(service.title)}
              />
            ))}
          </div>
        </div>
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
