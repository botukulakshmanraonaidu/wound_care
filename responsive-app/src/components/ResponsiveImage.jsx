import React from 'react';

const ResponsiveImage = () => {
  return (
    <section className="py-12 w-full">
      <div className="mb-8 px-4 md:px-0">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Optimized Media</h2>
        <p className="text-gray-600 text-sm md:text-base mb-6">
          Images automatically scale to viewport widths without overflowing. Using native lazy-loading capabilities speeds up the initial paint on mobile networks.
        </p>
        
        <div className="w-full rounded-2xl md:rounded-[2rem] overflow-hidden shadow-xl bg-gray-100 relative max-h-[600px]">
          <img 
            src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80" 
            alt="Responsive Workspace" 
            className="w-full h-auto object-cover max-w-full hover:scale-105 transition-transform duration-700 ease-in-out"
            loading="lazy" 
          />
        </div>
      </div>
    </section>
  );
};

export default ResponsiveImage;
