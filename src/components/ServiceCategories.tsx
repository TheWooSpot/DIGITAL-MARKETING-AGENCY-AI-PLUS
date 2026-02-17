import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, MessageCircle, DollarSign, Settings, GraduationCap, Sparkles, Info } from 'lucide-react';
import { ServiceDetailSheet } from '@/components/ServiceDetailSheet';
import type { ServiceDetail } from '@/types/services';

function isServiceDetail(d: string | ServiceDetail): d is ServiceDetail {
  return typeof d === 'object' && d !== null && 'id' in d;
}

const growthServices: ServiceDetail[] = [
  {
    id: 'searchlift',
    name: 'SearchLift™ SBO Engine',
    tagline: 'Position your brand where buying decisions begin.',
    description:
      'When customers search, your brand should be found — not buried. SearchLift™ engineers structured visibility across search engines and AI-driven discovery platforms to generate sustained inbound demand. This isn\'t surface-level SEO. It\'s search dominance architecture.',
    howItWorks: [
      'Search Box Optimization (SBO)',
      'Structured content & schema alignment',
      'AI-enhanced publishing cadence',
      'Authority signal amplification',
      'Index acceleration frameworks',
    ],
    businessImpact: [
      'Higher ranking velocity',
      'Increased organic lead flow',
      'Reduced dependency on paid ads',
      'Long-term digital asset growth',
    ],
    infrastructure:
      'Powered by advanced SEO architecture, AI publishing systems, and structured indexing frameworks.',
    tier: 1,
    cta: 'Explore Implementation →',
  },
  {
    id: 'spotlight-streams',
    name: 'Spotlight Streams™ OTT Boost',
    tagline: 'Appear where premium attention lives.',
    description:
      'Your brand is placed inside streaming environments — not just social feeds. This elevates perception, expands reach beyond traditional ads, and builds high-impact awareness across connected TV ecosystems.',
    howItWorks: [
      'OTT / CTV campaign placement',
      'Audience targeting refinement',
      'Cross-device attribution',
      'Brand lift optimization',
      'Streaming platform distribution',
    ],
    businessImpact: [
      'Elevated brand credibility',
      'Expanded demographic reach',
      'Measurable awareness growth',
      'Premium positioning advantage',
    ],
    infrastructure:
      'Delivered through advanced streaming ad networks and cross-platform attribution systems.',
    tier: 2,
    cta: 'Explore Campaign Strategy →',
  },
  {
    id: 'authority-amplifier',
    name: 'Authority Amplifier™ PR System',
    tagline: 'Trust built at scale.',
    description:
      'We secure digital placements that position your brand as established, credible, and newsworthy. Authority visibility builds trust faster than ads and strengthens search credibility simultaneously.',
    howItWorks: [
      'Digital PR distribution',
      'Media placement strategy',
      'Authority backlink structuring',
      'Brand narrative positioning',
      'Search reputation enhancement',
    ],
    businessImpact: [
      'Increased perceived legitimacy',
      'Shortened sales cycles',
      'Higher conversion trust factor',
      'Strengthened SEO authority',
    ],
    infrastructure:
      'Powered by national media distribution networks and structured authority amplification frameworks.',
    tier: 2,
    cta: 'Build Authority →',
  },
  {
    id: 'signal-surge',
    name: 'Signal Surge™ Paid Traffic Lab',
    tagline: 'Engineered traffic. Predictable growth.',
    description:
      'Strategic paid acquisition campaigns designed for ROI — not vanity metrics. We attract qualified buyers, optimize cost per acquisition, and scale performance methodically.',
    howItWorks: [
      'Paid search campaigns',
      'Paid social campaigns',
      'Conversion optimization loops',
      'Audience refinement modeling',
      'Cost-per-acquisition engineering',
    ],
    businessImpact: [
      'Increased qualified lead volume',
      'Controlled acquisition costs',
      'Predictable scaling capability',
      'Faster revenue velocity',
    ],
    infrastructure:
      'Powered by advanced ad platform orchestration and real-time performance optimization systems.',
    tier: 1,
    cta: 'Launch Paid Strategy →',
  },
];

interface ServiceCategory {
  id: number;
  title: string;
  purpose: string;
  subheader?: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  details: Array<string | ServiceDetail>;
}

const ServiceCategories = () => {
  const [activePanel, setActivePanel] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);

  const categories: ServiceCategory[] = [
    {
      id: 1,
      title: 'Growth & Visibility',
      purpose: 'Help businesses get discovered, attract attention, and generate demand',
      subheader: 'Get discovered. Get remembered.',
      icon: <TrendingUp className="w-8 h-8" />,
      color: 'from-purple-300 to-pink-300',
      gradient: 'bg-gradient-to-br from-purple-100/80 to-pink-100/80',
      details: growthServices,
    },
    {
      id: 2,
      title: 'Engagement & Conversation',
      purpose: 'Manage and optimize how prospects and customers communicate with the business',
      icon: <MessageCircle className="w-8 h-8" />,
      color: 'from-blue-300 to-cyan-300',
      gradient: 'bg-gradient-to-br from-blue-100/80 to-cyan-100/80',
      details: [
        'AI Chat Bots & Assistants',
        'Live Chat Management',
        'Email Marketing Automation',
        'SMS & Text Campaigns',
        'Social Media Engagement',
      ],
    },
    {
      id: 3,
      title: 'Conversion & Revenue Enablement',
      purpose: 'Turn conversations and interest into booked appointments, signed agreements, and paid revenue',
      icon: <DollarSign className="w-8 h-8" />,
      color: 'from-green-300 to-emerald-300',
      gradient: 'bg-gradient-to-br from-green-100/80 to-emerald-100/80',
      details: [
        'Sales Funnel Optimization',
        'Appointment Booking Systems',
        'Payment Gateway Integration',
        'CRM & Pipeline Management',
        'Conversion Rate Optimization',
      ],
    },
    {
      id: 4,
      title: 'Operations & Infrastructure',
      purpose: 'Run the business efficiently, consistently, and at scale',
      icon: <Settings className="w-8 h-8" />,
      color: 'from-orange-300 to-amber-300',
      gradient: 'bg-gradient-to-br from-orange-100/80 to-amber-100/80',
      details: [
        'Business Operating Systems',
        'Workflow Automation',
        'Data Management & Analytics',
        'Integration & APIs',
        'Performance Monitoring',
      ],
    },
    {
      id: 5,
      title: 'Knowledge, Training & Enablement',
      purpose: 'Ensure adoption, understanding, and long-term success for clients and teams',
      icon: <GraduationCap className="w-8 h-8" />,
      color: 'from-indigo-300 to-purple-300',
      gradient: 'bg-gradient-to-br from-indigo-100/80 to-purple-100/80',
      details: [
        'Team Training Programs',
        'Documentation & Resources',
        'Onboarding & Support',
        'Best Practices Consulting',
        'Ongoing Education',
      ],
    },
    {
      id: 6,
      title: 'Brand, Media & Experience',
      purpose: 'Shape perception, recall, and emotional connection across all touchpoints',
      icon: <Sparkles className="w-8 h-8" />,
      color: 'from-rose-300 to-pink-300',
      gradient: 'bg-gradient-to-br from-rose-100/80 to-pink-100/80',
      details: [
        'Brand Strategy & Identity',
        'Creative Design Services',
        'Video & Content Production',
        'User Experience Design',
        'Multi-Channel Campaigns',
      ],
    },
  ];

  const handleServiceClick = (service: ServiceDetail) => {
    setSelectedService(service);
    setServiceSheetOpen(true);
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors" />

      {/* Animated background elements */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            AI+ Digital Marketing Solutions
          </h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
            Powering growth for startups, enterprises, SMBs, and non-profits with
            intelligent marketing solutions
          </p>
        </motion.div>

        {/* Service Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <motion.div
                className={`relative rounded-3xl p-8 cursor-pointer transition-all duration-500 ${category.gradient} dark:bg-gradient-to-br dark:from-gray-800/80 dark:to-gray-700/80 glass dark:glass-dark border-2 border-white/50 dark:border-gray-700/50 shadow-lg hover:shadow-2xl`}
                whileHover={{ scale: 1.02, y: -5 }}
                onClick={() =>
                  setActivePanel(activePanel === category.id ? null : category.id)
                }
              >
                {/* Icon with gradient background */}
                <motion.div
                  className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${category.color} mb-6 shadow-lg`}
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  {category.icon}
                </motion.div>

                {/* Category Number */}
                <div className="absolute top-6 right-6">
                  <div className="w-10 h-10 rounded-full bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm flex items-center justify-center font-bold text-gray-700 dark:text-gray-200">
                    {category.id}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {category.title}
                </h3>

                {/* Purpose */}
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {category.purpose}
                </p>

                {/* Subheader - e.g. Get discovered. Get remembered. */}
                {category.subheader && (
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-4 italic">
                    {category.subheader}
                  </p>
                )}

                {/* Expand indicator */}
                <motion.div
                  className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-400"
                  animate={{ x: activePanel === category.id ? 5 : 0 }}
                >
                  {activePanel === category.id ? 'Click to close' : 'Click to explore'}
                  <motion.span
                    className="ml-2 text-lg"
                    animate={{ rotate: activePanel === category.id ? 180 : 0 }}
                  >
                    ↓
                  </motion.span>
                </motion.div>

                {/* Sliding Panel */}
                <AnimatePresence>
                  {activePanel === category.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 pt-6 border-t-2 border-white/50 dark:border-gray-600/50">
                        <h4 className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-100">
                          Key Services Include:
                        </h4>
                        <ul className="space-y-3 list-none">
                          {category.details.map((detail, idx) =>
                            isServiceDetail(detail) ? (
                              <motion.li
                                key={detail.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1, duration: 0.22 }}
                                className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 -mx-3 opacity-85 hover:opacity-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-200/30 dark:hover:shadow-purple-900/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleServiceClick(detail);
                                }}
                                whileHover={{ y: -2 }}
                              >
                                <span className="text-gray-700 dark:text-gray-300 font-medium flex-1">
                                  {detail.name}
                                </span>
                                <Info className="w-4 h-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                              </motion.li>
                            ) : (
                              <motion.li
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-start"
                              >
                                <span className="text-gray-700 dark:text-gray-300">{detail}</span>
                              </motion.li>
                            )
                          )}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-4 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 hover:from-purple-600 hover:via-blue-600 hover:to-pink-600 text-white font-bold text-lg rounded-full shadow-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
          >
            Start Your Growth Journey
          </motion.button>
        </motion.div>
      </div>

      <ServiceDetailSheet
        service={selectedService}
        open={serviceSheetOpen}
        onOpenChange={setServiceSheetOpen}
      />
    </section>
  );
};

export default ServiceCategories;
