import React from 'react';

const Card = ({ title, description, badge }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-lg md:text-xl font-bold text-gray-900">{title}</h3>
      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">{badge}</span>
    </div>
    <p className="text-gray-600 text-sm md:text-base flex-grow mb-8 leading-relaxed">
      {description}
    </p>
    <button className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 touch-target focus:ring-4 focus:ring-blue-100 outline-none">
      Learn More
    </button>
  </div>
);

const ResponsiveGrid = () => {
  const cards = [
    { title: "Mobile First View", description: "On mobile devices (sm: max-width 480px), this card occupies 100% of the screen width, stacking vertically to provide standard readable space. Padding and typography size dynamically scale down.", badge: "Mobile" },
    { title: "Tablet Adaptability", description: "On tablets (md: max-width 768px), the layout utilizes CSS Grid to form a 2-column list. It prevents the cards from stretching extremely wide, wrapping beautifully on modern devices.", badge: "Tablet" },
    { title: "Desktop Expansion", description: "Once the viewport exceeds 1024px, the grid snaps to a 3-column architecture. This ensures maximal use of the ultra-wide space, creating an aesthetically pleasing layout.", badge: "Desktop" },
  ];

  return (
    <section className="py-16 md:py-24 w-full">
      <div className="mb-12 text-center md:text-left px-4 md:px-0">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Flexible Grid System</h2>
        <p className="text-gray-600 max-w-2xl text-base md:text-lg leading-relaxed">
          The layout automatically recalculates widths, margins, and columns based on the viewing device without using fixed pixel hardcoding.
        </p>
      </div>

      {/* Grid container with responsive breakpoints */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 w-full px-4 md:px-0">
        {cards.map((card, idx) => (
          <Card key={idx} {...card} />
        ))}
      </div>
    </section>
  );
};

export default ResponsiveGrid;
