
import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';

const GlobalOffices = () => {
  const offices = [
    {
      country: "United States",
      city: "New York",
      address: "Empire State Building, 350 5th Ave",
      phone: "+1 (555) 123-4567",
      email: "usa@headquarters-inc.com",
      color: "from-blue-500 to-blue-600"
    },
    {
      country: "Australia",
      city: "Sydney", 
      address: "Level 45, 680 George Street",
      phone: "+61 2 9876 5432",
      email: "aus@headquarters-inc.com",
      color: "from-green-500 to-green-600"
    },
    {
      country: "Japan",
      city: "Tokyo",
      address: "Shibuya Sky, 2-24-12 Shibuya",
      phone: "+81 3 1234 5678",
      email: "japan@headquarters-inc.com",
      color: "from-red-500 to-red-600"
    },
    {
      country: "South Africa",
      city: "Cape Town",
      address: "Clock Tower Precinct, V&A Waterfront",
      phone: "+27 21 123 4567",
      email: "sa@headquarters-inc.com",
      color: "from-orange-500 to-orange-600"
    },
    {
      country: "Ireland",
      city: "Dublin",
      address: "One Dockland Central, Guild Street",
      phone: "+353 1 234 5678",
      email: "ireland@headquarters-inc.com",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      country: "Belgium",
      city: "Brussels",
      address: "Avenue Louise 149, Ixelles",
      phone: "+32 2 123 4567",
      email: "belgium@headquarters-inc.com",
      color: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <section id="offices" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Global Presence
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            With offices across six continents, we provide 24/7 support and local expertise wherever your business operates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {offices.map((office, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
            >
              <div className={`h-2 bg-gradient-to-r ${office.color}`}></div>
              
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-800">{office.country}</h3>
                <p className="text-lg text-gray-600 mb-4">{office.city}</p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <span className="text-gray-600">{office.address}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">{office.phone}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">{office.email}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GlobalOffices;
