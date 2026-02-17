export interface ServiceDetail {
  id: string;
  name: string;
  tagline: string;
  description: string;
  howItWorks: string[];
  businessImpact: string[];
  infrastructure: string;
  tier: 1 | 2 | 3;
  cta: string;
}
