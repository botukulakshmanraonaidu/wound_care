import React from 'react';
import Navbar from './components/Navbar';
import ResponsiveGrid from './components/ResponsiveGrid';
import ResponsiveTable from './components/ResponsiveTable';
import ResponsiveImage from './components/ResponsiveImage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900 pt-16">
      <Navbar />
      
      {/* Main Container leveraging clamp or percentage widths */}
      <main className="max-w-[1440px] mx-auto px-0 sm:px-6 lg:px-8 w-full pb-20">
        
        {/* Hero Section */}
        <header className="py-16 md:py-24 px-4 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2 w-full">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
              Mobile-First <br/> <span className="text-blue-600">Perfection.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mb-8 leading-relaxed mx-auto md:mx-0">
              Experience a genuinely fluid interface. This page intelligently reorganizes spacing, hierarchy, and density based exclusively on your device viewport.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 outline-none focus:ring-4 focus:ring-blue-100 touch-target w-full sm:w-auto">
                Discover Features
              </button>
              <button className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:border-gray-300 outline-none hover:-translate-y-0.5 touch-target w-full sm:w-auto">
                Read Documentation
              </button>
            </div>
          </div>
          
          <div className="md:w-5/12 w-full px-4 md:px-0">
            <div className="bg-blue-100 rounded-[2rem] sm:rounded-[3rem] rotate-3 hover:rotate-6 transition-transform duration-500 overflow-hidden shadow-2xl relative aspect-square">
                <img 
                  src="https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?auto=format&fit=crop&w=800&q=80" 
                  alt="App Preview" 
                  className="w-full h-full object-cover max-w-full" 
                  loading="lazy"
                />
            </div>
          </div>
        </header>

        {/* Dynamic Components */}
        <ResponsiveGrid />
        
        <div className="my-4 border-t border-gray-200 w-full px-4 hidden md:block"></div>
        
        <ResponsiveTable />
        
        <div className="my-4 border-t border-gray-200 w-full px-4 hidden md:block"></div>
        
        <ResponsiveImage />

      </main>
      
      <footer className="bg-gray-900 py-12 text-center text-gray-400 mt-auto">
        <p className="text-sm font-medium">Engineered with flexible units & Tailwind CSS breakpoints.</p>
      </footer>
    </div>
  );
}

export default App;
