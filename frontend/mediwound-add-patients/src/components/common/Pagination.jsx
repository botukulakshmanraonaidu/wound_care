import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

const Pagination = ({ 
  currentPage, 
  totalCount, 
  pageSize = 10, 
  onPageChange, 
  loading = false 
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1 && totalCount > 0) return null;
  if (totalCount === 0 && !loading) return null;

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end === totalPages) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing <span className="font-bold">{Math.min(totalCount, (currentPage - 1) * pageSize + 1)}</span> to{' '}
        <span className="font-bold">{Math.min(totalCount, currentPage * pageSize)}</span> of{' '}
        <span className="font-bold">{totalCount}</span> results
      </div>
      
      <div className="pagination-controls">
        <button 
          className="pagination-btn" 
          onClick={handlePrevious} 
          disabled={currentPage === 1 || loading}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="pagination-numbers">
          {getPageNumbers().map(num => (
            <button
              key={num}
              className={`pagination-number-btn ${currentPage === num ? 'active' : ''}`}
              onClick={() => onPageChange(num)}
              disabled={loading}
            >
              {num}
            </button>
          ))}
          {totalPages > 5 && getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
            <>
              <span className="pagination-ellipsis">...</span>
              <button
                className="pagination-number-btn"
                onClick={() => onPageChange(totalPages)}
                disabled={loading}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <button 
          className="pagination-btn" 
          onClick={handleNext} 
          disabled={currentPage === totalPages || loading}
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
