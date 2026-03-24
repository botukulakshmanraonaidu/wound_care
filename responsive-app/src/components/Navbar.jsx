import React, { useState } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 w-full fixed top-0 left-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-2xl font-bold text-blue-600 tracking-tight">FlexiUI</h1>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex flex-row space-x-1 lg:space-x-4">
            <a href="#" className="text-gray-700 hover:bg-gray-50 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-all">Home</a>
            <a href="#" className="text-gray-700 hover:bg-gray-50 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-all">Features</a>
            <a href="#" className="text-gray-700 hover:bg-gray-50 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-all">Pricing</a>
            <a href="#" className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2 rounded-lg text-sm font-medium transition-all ml-4">Get Started</a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 p-2 rounded-md touch-target transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-64 border-t border-gray-100' : 'max-h-0'}`}>
        <div className="px-4 py-3 space-y-2 bg-white shadow-inner">
          <a href="#" className="block px-3 py-3 text-base font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">Home</a>
          <a href="#" className="block px-3 py-3 text-base font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">Features</a>
          <a href="#" className="block px-3 py-3 text-base font-medium text-gray-800 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">Pricing</a>
          <a href="#" className="block px-3 py-3 mt-4 text-base font-medium text-center text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Get Started</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
