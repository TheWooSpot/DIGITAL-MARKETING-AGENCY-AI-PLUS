import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, MessageCircle, DollarSign, Settings, GraduationCap, Sparkles, Info, BarChart3, Shield, Handshake, Crown, ChevronDown } from 'lucide-react';
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
      'Powered by uSBO (Search Optimization) and advanced SEO architecture.',
    tier: 1,
    cta: 'Explore Implementation →',
  },
  {
    id: 'directalign',
    name: 'DirectAlign™ Media Engine',
    tagline: 'Own the screen before competitors appear.',
    description:
      'DirectAlign™ deploys your brand across connected TV, streaming platforms, and digital out-of-home networks — turning passive audiences into high-trust brand familiarity.',
    howItWorks: [
      'OTT / CTV campaign placement',
      'Digital out-of-home network deployment',
      'Audience targeting refinement',
      'Cross-device attribution',
      'Brand lift optimization',
    ],
    businessImpact: [
      'Elevated brand credibility',
      'Expanded demographic reach',
      'Measurable awareness growth',
      'Premium positioning advantage',
    ],
    infrastructure:
      'Delivered through uEVERYWHERE OPM, JamLoop, OTT / CTV, and OOH platforms.',
    tier: 2,
    cta: 'Explore Campaign Strategy →',
  },
  {
    id: 'authority-amplifier',
    name: 'Authority Amplifier™ PR System',
    tagline: 'Credibility compounds visibility.',
    description:
      'Authority Amplifier™ positions your brand across digital media outlets to generate trust, backlinks, and reputation signals that strengthen both SEO and buyer confidence.',
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
      'Powered by uPR and national media distribution networks.',
    tier: 2,
    cta: 'Build Authority →',
  },
  {
    id: 'signal-surge',
    name: 'Signal Surge™ Paid Traffic Lab',
    tagline: 'Precision paid acquisition across search, social, and display.',
    description:
      'Signal Surge™ activates controlled ad campaigns across search, social, and display networks designed to generate immediate leads while feeding long-term data intelligence.',
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
      'Powered by paid ads fulfillment partners and advanced ad platform orchestration.',
    tier: 1,
    cta: 'Launch Paid Strategy →',
  },
  {
    id: 'nearrank',
    name: 'NearRank™ Local Discovery Engine',
    tagline: 'When customers search "near me," you must appear first — not fourth.',
    description:
      'NearRank™ dominates local map pack visibility across Google, Apple Maps, voice search, and 200+ discovery platforms. This is automated local search infrastructure.',
    howItWorks: [
      'Local map pack optimization',
      'Google Business Profile management',
      'Apple Maps and voice search alignment',
      'Multi-platform local listing sync',
      'NearMe campaign management',
    ],
    businessImpact: [
      'Dominant local search visibility',
      'Higher "near me" conversion share',
      'Voice search readiness',
      'Scalable local presence',
    ],
    infrastructure:
      'Powered by uMNM (NearMe Campaign Management) and local discovery platforms.',
    tier: 1,
    cta: 'Dominate Local Search →',
  },
];

const engagementServices: ServiceDetail[] = [
  {
    id: 'convoflow',
    name: 'ConvoFlow™ AI Chat Suite',
    tagline: 'Intelligent conversational automation across web, SMS, and social.',
    description:
      'ConvoFlow™ qualifies leads, answers questions, and routes opportunities across web, SMS, and social messaging channels — without human bottlenecks.',
    howItWorks: [
      'AI chat deployment across web and SMS',
      'Intent detection and routing logic',
      'Qualification and lead scoring',
      'Real-time handoff to human agents',
      'Conversation analytics and optimization',
    ],
    businessImpact: [
      '24/7 automated engagement',
      'Higher lead qualification rates',
      'Reduced response latency',
      'Scalable conversation capacity',
    ],
    infrastructure:
      'Powered by AI conversation platforms, natural language processing, and multi-channel orchestration systems.',
    tier: 1,
    cta: 'Deploy AI Chat →',
  },
  {
    id: 'inboxignite',
    name: 'InboxIgnite™ Smart Email Engine',
    tagline: 'High-volume, targeted email deployment engineered for ROI.',
    description:
      'InboxIgnite™ transforms email from a newsletter tool into a measurable revenue channel using segmentation, automation, and campaign intelligence.',
    howItWorks: [
      'Automated email sequence design',
      'Behavioral trigger workflows',
      'Personalization and segmentation',
      'A/B testing and optimization',
      'Deliverability and list health',
    ],
    businessImpact: [
      'Consistent nurture at scale',
      'Higher email engagement rates',
      'Shortened time to conversion',
      'Reduced manual campaign work',
    ],
    infrastructure:
      'Delivered through uBLAST (Insane Email Marketing) and enterprise email platforms.',
    tier: 1,
    cta: 'Launch Email Engine →',
  },
  {
    id: 'textpulse',
    name: 'TextPulse™ SMS Automation',
    tagline: 'Real-time SMS engagement designed to increase response rates.',
    description:
      'TextPulse™ turns mobile messaging into a high-conversion communication layer for reminders, offers, and engagement.',
    howItWorks: [
      'SMS campaign design and sequencing',
      'Opt-in and consent management',
      'Trigger-based messaging',
      'Two-way conversation flows',
      'Compliance and deliverability',
    ],
    businessImpact: [
      'Higher open and response rates',
      'Faster customer activation',
      'Reduced no-shows and churn',
      'Direct revenue attribution',
    ],
    infrastructure:
      'Powered by SMS gateway providers, automation platforms, and TCPA-compliant consent systems.',
    tier: 2,
    cta: 'Activate SMS →',
  },
  {
    id: 'voicebridge',
    name: 'VoiceBridge™ AI Receptionist',
    tagline: '24/7 intelligent voice response and lead routing.',
    description:
      'VoiceBridge™ answers, qualifies, books, and escalates calls without missing opportunities or overloading staff.',
    howItWorks: [
      'AI voice agent deployment',
      'Call routing and qualification',
      'Calendar and scheduling integration',
      'Fallback and escalation logic',
      'Call analytics and optimization',
    ],
    businessImpact: [
      '24/7 call coverage',
      'Reduced missed opportunity',
      'Faster appointment booking',
      'Consistent caller experience',
    ],
    infrastructure:
      'Powered by AI voice platforms, telephony integrations, and real-time speech processing.',
    tier: 1,
    cta: 'Deploy Voice AI →',
  },
];

const appointmentsServices: ServiceDetail[] = [
  {
    id: 'bookstream',
    name: 'BookStream™ Smart Scheduling Hub',
    tagline: 'Convert interest into confirmed appointments.',
    description:
      'BookStream™ structures automated booking, reminders, confirmations, and follow-ups — reducing no-shows and maximizing scheduled revenue without manual coordination.',
    howItWorks: [
      'Online booking widget and pages',
      'Calendar sync and availability',
      'Automated reminders and confirmations',
      'No-show reduction workflows',
      'Integration with CRM and payments',
    ],
    businessImpact: [
      'Higher booking conversion',
      'Reduced no-show rates',
      'Eliminated scheduling friction',
      'Scalable appointment capacity',
    ],
    infrastructure:
      'Powered by scheduling platforms, calendar APIs, and notification systems.',
    tier: 1,
    cta: 'Set Up Booking →',
  },
  {
    id: 'closecraft',
    name: 'CloseCraft™ Funnel Builder',
    tagline: 'Architect high-conversion pathways from click to commitment.',
    description:
      'CloseCraft™ builds optimized landing flows that guide prospects toward action with clarity and persuasive sequencing.',
    howItWorks: [
      'Landing page and funnel design',
      'Offer structure and copy',
      'Conversion tracking and analytics',
      'A/B testing and optimization',
      'Integration with booking and payment',
    ],
    businessImpact: [
      'Higher conversion rates',
      'Faster prospect-to-customer flow',
      'Clear conversion attribution',
      'Repeatable funnel performance',
    ],
    infrastructure:
      'Delivered through landing page builders, analytics platforms, and conversion optimization tools.',
    tier: 1,
    cta: 'Build Your Funnel →',
  },
  {
    id: 'dealdrive',
    name: 'DealDrive™ Proposal Automation',
    tagline: 'Accelerate decision-making with structured, automated proposals.',
    description:
      'DealDrive™ shortens sales cycles and increases close velocity with dynamic pricing logic and automated proposal flows.',
    howItWorks: [
      'Proposal generation and templates',
      'E-signature and approval flows',
      'Follow-up automation',
      'Deal stage tracking',
      'Integration with CRM and payments',
    ],
    businessImpact: [
      'Shorter sales cycles',
      'Higher close rates',
      'Reduced manual proposal work',
      'Faster revenue recognition',
    ],
    infrastructure:
      'Powered by proposal software, e-signature platforms, and CRM integrations.',
    tier: 2,
    cta: 'Automate Proposals →',
  },
  {
    id: 'payportal',
    name: 'PayPortal™ Dynamic Checkout',
    tagline: 'Seamless payment processing with intelligent pricing logic.',
    description:
      'PayPortal™ enables subscription, one-time, and performance-based payment structures with frictionless checkout.',
    howItWorks: [
      'Payment gateway integration',
      'Dynamic pricing and tiers',
      'Checkout flow optimization',
      'Subscription and one-time options',
      'Fraud and compliance safeguards',
    ],
    businessImpact: [
      'Higher payment completion',
      'Flexible pricing options',
      'Reduced checkout abandonment',
      'Secure, compliant transactions',
    ],
    infrastructure:
      'Powered by payment processors, checkout platforms, and PCI-compliant systems.',
    tier: 1,
    cta: 'Enable Payments →',
  },
];

const systemsOperationsServices: ServiceDetail[] = [
  {
    id: 'hubai',
    name: 'HubAI™ CRM Architecture',
    tagline: 'Your central intelligence layer.',
    description:
      'HubAI™ unifies contacts, automation, pipeline management, and reporting into one operational command center.',
    howItWorks: [
      'CRM architecture and data modeling',
      'Contact and pipeline alignment',
      'Automation workflow design',
      'Reporting and dashboard setup',
      'Integration with sales and marketing tools',
    ],
    businessImpact: [
      'Single source of truth for customer data',
      'Clear pipeline visibility',
      'Reduced manual data entry',
      'Faster decision-making',
    ],
    infrastructure:
      'Powered by umbrella CRM and automation stack platforms.',
    tier: 1,
    cta: 'Structure Your CRM →',
  },
  {
    id: 'flowforge',
    name: 'FlowForge™ Automation Lab',
    tagline: 'Build once, automate forever.',
    description:
      'FlowForge™ connects systems, triggers workflows, and eliminates repetitive manual processes across your tech stack.',
    howItWorks: [
      'Workflow mapping and design',
      'System integration architecture',
      'Trigger-based automation flows',
      'Error handling and monitoring',
      'Scalable automation patterns',
    ],
    businessImpact: [
      'Reduced manual workload',
      'Faster process execution',
      'Fewer human errors',
      'Scalable operations',
    ],
    infrastructure:
      'Delivered through automation platforms, API integrations, and workflow orchestration systems.',
    tier: 1,
    cta: 'Engineer Automations →',
  },
  {
    id: 'commanddesk',
    name: 'CommandDesk™ Client Portal System',
    tagline: 'Centralized client visibility and collaboration.',
    description:
      'CommandDesk™ provides branded portals for reporting, assets, communication, and shared deliverables.',
    howItWorks: [
      'Portal architecture and access design',
      'Document and file management',
      'Project visibility dashboards',
      'Secure communication channels',
      'Role-based permissions',
    ],
    businessImpact: [
      'Unified client experience',
      'Reduced email and status requests',
      'Faster project transparency',
      'Professional collaboration',
    ],
    infrastructure:
      'Powered by portal platforms, secure file storage, and collaboration tools.',
    tier: 2,
    cta: 'Deploy Client Portal →',
  },
];

const knowledgeActivationServices: ServiceDetail[] = [
  {
    id: 'skillsprint',
    name: 'SkillSprint™ Academy',
    tagline: 'Structured learning environments for internal teams or clients.',
    description:
      'SkillSprint™ delivers guided educational tracks, certifications, and competency development.',
    howItWorks: [
      'Learning path and curriculum design',
      'Course and module creation',
      'Assessment and certification',
      'Progress tracking and analytics',
      'Onboarding sequence automation',
    ],
    businessImpact: [
      'Scalable knowledge transfer',
      'Consistent training quality',
      'Reduced onboarding time',
      'Retention of institutional knowledge',
    ],
    infrastructure:
      'Delivered through learning management systems, content platforms, and assessment tools.',
    tier: 1,
    cta: 'Build Learning Hub →',
  },
  {
    id: 'onboardx',
    name: 'OnboardX™ Client Activation System',
    tagline: 'Transform new clients into activated partners quickly.',
    description:
      'OnboardX™ standardizes intake, setup, and early momentum milestones.',
    howItWorks: [
      'Onboarding sequence design',
      'Welcome and orientation flows',
      'Checklist and milestone tracking',
      'Resource and tool introduction',
      'Success metric activation',
    ],
    businessImpact: [
      'Faster time to value',
      'Higher retention rates',
      'Reduced support burden',
      'Stronger client relationships',
    ],
    infrastructure:
      'Powered by onboarding platforms, automation builders, and communication tools.',
    tier: 1,
    cta: 'Activate Clients →',
  },
];

const brandSignalServices: ServiceDetail[] = [
  {
    id: 'voice-vibe',
    name: 'Voice & Vibe™ Production Engine',
    tagline: 'Your brand\'s sound, style, and signal clarity.',
    description:
      'Voice & Vibe™ produces visual and narrative assets that align messaging, aesthetics, and authority across channels.',
    howItWorks: [
      'Sonic identity and voice design',
      'Branded audio asset creation',
      'Production framework development',
      'Multi-platform deployment',
      'AI voice and emerging channel readiness',
    ],
    businessImpact: [
      'Faster brand recognition',
      'Distinctive audio presence',
      'Scalable across media and AI',
      'Memorable brand signals',
    ],
    infrastructure:
      'Powered by audio production tools, voice platforms, and media distribution systems.',
    tier: 2,
    cta: 'Build Sonic Identity →',
  },
  {
    id: 'storyframe',
    name: 'StoryFrame™ Brand Narrative Suite',
    tagline: 'Positioning clarity drives performance.',
    description:
      'StoryFrame™ builds structured messaging architecture that aligns brand voice, audience psychology, and market differentiation.',
    howItWorks: [
      'Positioning and messaging strategy',
      'Narrative hierarchy design',
      'Copy and content frameworks',
      'Platform-specific adaptation',
      'Influence and persuasion architecture',
    ],
    businessImpact: [
      'Clear, consistent messaging',
      'Stronger brand cohesion',
      'Higher conversion influence',
      'Aligned voice across touchpoints',
    ],
    infrastructure:
      'Delivered through brand strategy frameworks, content systems, and messaging tools.',
    tier: 1,
    cta: 'Architect Your Narrative →',
  },
];

const performanceInsightsServices: ServiceDetail[] = [
  {
    id: 'insightloop',
    name: 'InsightLoop™ Analytics Dashboard',
    tagline: 'Data without interpretation is noise.',
    description:
      'InsightLoop™ centralizes performance data into actionable intelligence dashboards for growth optimization.',
    howItWorks: [
      'Data source integration',
      'Dashboard and visualization design',
      'Metric and KPI definition',
      'Automated reporting flows',
      'Strategic insight surfacing',
    ],
    businessImpact: [
      'Data-driven decision-making',
      'Faster performance visibility',
      'Reduced manual reporting',
      'Clear strategic direction',
    ],
    infrastructure:
      'Powered by reporting and analytics platforms.',
    tier: 1,
    cta: 'Build Your Dashboard →',
  },
];

const governanceGuardrailsServices: ServiceDetail[] = [
  {
    id: 'trustguard',
    name: 'TrustGuard™ Governance Layer',
    tagline: 'Protect the ecosystem.',
    description:
      'TrustGuard™ establishes data governance, automation boundaries, brand safety, and compliance protocols.',
    howItWorks: [
      'Permission and access design',
      'Compliance framework implementation',
      'AI usage policy and guardrails',
      'Operational safeguard deployment',
      'Audit and monitoring setup',
    ],
    businessImpact: [
      'Protected brand and client trust',
      'Compliance confidence',
      'Controlled AI deployment',
      'Scalable governance',
    ],
    infrastructure:
      'Delivered through governance platforms, compliance tools, and monitoring systems.',
    tier: 2,
    cta: 'Implement Governance →',
  },
];

const partnershipsExpansionServices: ServiceDetail[] = [
  {
    id: 'allianceos',
    name: 'AllianceOS™ Growth Partnerships Engine',
    tagline: 'Scale through leverage.',
    description:
      'AllianceOS™ structures white-label, reseller, and JV frameworks to expand distribution without operational overload.',
    howItWorks: [
      'Partnership model design',
      'White-label system architecture',
      'Reseller and JV pathway setup',
      'Alliance structure and agreements',
      'Revenue share and tracking',
    ],
    businessImpact: [
      'Expanded market reach',
      'Scaled capacity without headcount',
      'New revenue streams',
      'Strategic growth acceleration',
    ],
    infrastructure:
      'Powered by partnership platforms, white-label systems, and alliance management tools.',
    tier: 2,
    cta: 'Scale Through Partnerships →',
  },
];

interface MembershipItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
}

const membershipLayer: MembershipItem[] = [
  {
    id: 'socialutely-circle',
    name: 'Socialutely Circle™',
    tagline: 'Annual ecosystem access.',
    description: 'Select tools, learning resources, and strategic updates for members.',
  },
  {
    id: 'momentum-vault',
    name: 'Momentum Vault™',
    tagline: 'Curated resource library.',
    description: 'Templates, playbooks, and intelligence assets for members.',
  },
  {
    id: 'concierge-access',
    name: 'Concierge Access™',
    tagline: 'Premium access layer.',
    description: 'Travel and experiential benefits aligned with strategic relationship tiers. FORA / Travel Partnerships.',
  },
  {
    id: 'ai-maturity-diagnostic',
    name: 'AI Maturity Diagnostic & Blueprint™',
    tagline: 'Structured AI readiness assessment.',
    description: 'Comprehensive assessment of your AI readiness and a tailored blueprint to mature your marketing operations.',
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
  const [servicesInCategory, setServicesInCategory] = useState<ServiceDetail[]>([]);
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [membershipExpanded, setMembershipExpanded] = useState(false);

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
      title: 'Engagement & Communication',
      purpose: 'Manage and optimize how prospects and customers communicate with the business',
      subheader: 'Spark interaction. Sustain conversation.',
      icon: <MessageCircle className="w-8 h-8" />,
      color: 'from-blue-300 to-cyan-300',
      gradient: 'bg-gradient-to-br from-blue-100/80 to-cyan-100/80',
      details: engagementServices,
    },
    {
      id: 3,
      title: 'Appointments & Conversions',
      purpose: 'Turn conversations and interest into booked appointments, signed agreements, and paid revenue',
      subheader: 'Turn attention into action.',
      icon: <DollarSign className="w-8 h-8" />,
      color: 'from-green-300 to-emerald-300',
      gradient: 'bg-gradient-to-br from-green-100/80 to-emerald-100/80',
      details: appointmentsServices,
    },
    {
      id: 4,
      title: 'Systems & Operations',
      purpose: 'Build infrastructure that runs without friction',
      subheader: 'Run efficiently. Scale intelligently.',
      icon: <Settings className="w-8 h-8" />,
      color: 'from-orange-300 to-amber-300',
      gradient: 'bg-gradient-to-br from-orange-100/80 to-amber-100/80',
      details: systemsOperationsServices,
    },
    {
      id: 5,
      title: 'Knowledge & Activation',
      purpose: 'Educate. Equip. Empower.',
      subheader: 'Turn expertise into scalable assets.',
      icon: <GraduationCap className="w-8 h-8" />,
      color: 'from-indigo-300 to-purple-300',
      gradient: 'bg-gradient-to-br from-indigo-100/80 to-purple-100/80',
      details: knowledgeActivationServices,
    },
    {
      id: 6,
      title: 'Brand & Signal',
      purpose: 'Define how your brand is heard, felt, and remembered',
      subheader: 'Engineer recognition across sound and presence.',
      icon: <Sparkles className="w-8 h-8" />,
      color: 'from-rose-300 to-pink-300',
      gradient: 'bg-gradient-to-br from-rose-100/80 to-pink-100/80',
      details: brandSignalServices,
    },
    {
      id: 7,
      title: 'Performance & Insights',
      purpose: 'Measure what matters. Improve what works.',
      subheader: 'Turn data into direction.',
      icon: <BarChart3 className="w-8 h-8" />,
      color: 'from-teal-300 to-cyan-300',
      gradient: 'bg-gradient-to-br from-teal-100/80 to-cyan-100/80',
      details: performanceInsightsServices,
    },
    {
      id: 8,
      title: 'Governance & Guardrails',
      purpose: 'Protect trust. Maintain control.',
      subheader: 'Operate responsibly. Scale securely.',
      icon: <Shield className="w-8 h-8" />,
      color: 'from-slate-300 to-gray-400',
      gradient: 'bg-gradient-to-br from-slate-100/80 to-gray-200/80',
      details: governanceGuardrailsServices,
    },
    {
      id: 9,
      title: 'Partnerships & Expansion',
      purpose: 'Scale through leverage.',
      subheader: 'Multiply reach without multiplying overhead.',
      icon: <Handshake className="w-8 h-8" />,
      color: 'from-violet-300 to-purple-300',
      gradient: 'bg-gradient-to-br from-violet-100/80 to-purple-100/80',
      details: partnershipsExpansionServices,
    },
  ];

  const handleServiceClick = (service: ServiceDetail, categoryDetails: Array<string | ServiceDetail>) => {
    const services = categoryDetails.filter((d): d is ServiceDetail => isServiceDetail(d));
    setServicesInCategory(services);
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
                                  handleServiceClick(detail, category.details);
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

        {/* Membership & Access Layer — Ecosystem strip (distinct treatment) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12"
        >
          <motion.button
            onClick={() => setMembershipExpanded(!membershipExpanded)}
            className="w-full flex items-center justify-between gap-4 rounded-2xl px-6 py-4 bg-gradient-to-r from-amber-900/90 via-amber-800/80 to-yellow-900/90 dark:from-amber-950 dark:via-amber-900/90 dark:to-amber-950 border-2 border-amber-500/40 shadow-xl hover:shadow-2xl transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-50">Membership & Access Layer</h3>
                <p className="text-sm text-amber-200/80">Ecosystem offerings beyond core SKUs</p>
              </div>
            </div>
            <motion.span
              animate={{ rotate: membershipExpanded ? 180 : 0 }}
              className="text-amber-300"
            >
              <ChevronDown className="w-6 h-6" />
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {membershipExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {membershipLayer.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="rounded-xl p-4 bg-amber-950/50 dark:bg-amber-950/70 border border-amber-600/30 hover:border-amber-500/50 transition-colors"
                    >
                      <h4 className="font-semibold text-amber-100 mb-1">{item.name}</h4>
                      <p className="text-xs text-amber-300/80 italic mb-2">{item.tagline}</p>
                      <p className="text-sm text-amber-200/70">{item.description}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

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
        servicesInCategory={servicesInCategory}
        onServiceSelect={setSelectedService}
        open={serviceSheetOpen}
        onOpenChange={setServiceSheetOpen}
      />
    </section>
  );
};

export default ServiceCategories;
