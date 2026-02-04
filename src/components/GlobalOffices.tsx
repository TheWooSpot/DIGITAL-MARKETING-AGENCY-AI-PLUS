import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Globe2 } from 'lucide-react';

const GlobalOffices = () => {
  const offices = [
    {
      country: "United States",
      city: "New York",
      address: "Empire State Building, 350 5th Ave",
      phone: "+1 (555) 123-4567",
      email: "usa@headquarters-inc.com",
      color: "from-blue-300 to-cyan-300"
    },
    {
      country: "Australia",
      city: "Sydney", 
      address: "Level 45, 680 George Street",
      phone: "+61 2 9876 5432",
      email: "aus@headquarters-inc.com",
      color: "from-green-300 to-emerald-300"
    },
    {
      country: "Japan",
      city: "Tokyo",
      address: "Shibuya Sky, 2-24-12 Shibuya",
      phone: "+81 3 1234 5678",
      email: "japan@headquarters-inc.com",
      color: "from-pink-300 to-rose-300"
    },
    {
      country: "South Africa",
      city: "Cape Town",
      address: "Clock Tower Precinct, V&A Waterfront",
      phone: "+27 21 123 4567",
      email: "sa@headquarters-inc.com",
      color: "from-orange-300 to-amber-300"
    },
    {
      country: "Ireland",
      city: "Dublin",
      address: "One Dockland Central, Guild Street",
      phone: "+353 1 234 5678",
      email: "ireland@headquarters-inc.com",
      color: "from-emerald-300 to-teal-300"
    },
    {
      country: "Belgium",
      city: "Brussels",
      address: "Avenue Louise 149, Ixelles",
      phone: "+32 2 123 4567",
      email: "belgium@headquarters-inc.com",
      color: "from-purple-300 to-indigo-300"
    }
  ];

  return (
    <section id="offices" className="relative py-24 px-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden transition-colors">
      {/* Background decoration */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 bg-purple-200/20 dark:bg-purple-900/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
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
          <motion.div
            className="inline-flex items-center gap-3 mb-6"
            whileHover={{ scale: 1.05 }}
          >
            <Globe2 className="w-12 h-12 text-purple-500 dark:text-purple-400" />
          </motion.div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 dark:from-purple-400 dark:via-blue-400 dark:to-pink-400 bg-clip-text text-transparent">
            Global Presence
          </h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            With offices across six continents, we provide 24/7 support and local expertise wherever your business operates.
          </p>
        </motion.div>

        {/* Offices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {offices.map((office, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group relative"
            >
              <div className="glass dark:glass-dark rounded-3xl overflow-hidden border-2 border-white/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                {/* Gradient header */}
                <div className={`h-3 bg-gradient-to-r ${office.color}`}></div>
                
                <div className="p-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                  {/* Country flag emoji could go here */}
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                      {office.country}
                    </h3>
                    <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">{office.city}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <motion.div
                      className="flex items-start gap-3"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 rounded-lg">
                        <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{office.address}</span>
                    </motion.div>
                    
                    <motion.div
                      className="flex items-center gap-3"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 rounded-lg">
                        <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm">{office.phone}</span>
                    </motion.div>
                    
                    <motion.div
                      className="flex items-center gap-3"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/50 dark:to-rose-900/50 rounded-lg">
                        <Mail className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm">{office.email}</span>
                    </motion.div>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${office.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Ready to connect with us?
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Contact Our Team
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default GlobalOffices;
