import React from 'react';
import '../styles/main.css';

const SuccessModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="success-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 className="text-serif">{title}</h2>
        </div>
        <div className="modal-body">
          <p className="text-secondary">{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Start Learning
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
