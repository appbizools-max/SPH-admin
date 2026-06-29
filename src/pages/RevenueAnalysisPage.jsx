import React from 'react';
import { useNavigate } from 'react-router-dom';
import RevenueAnalysis from '../components/RevenueAnalysis';
import { ArrowLeft } from 'lucide-react';

const RevenueAnalysisPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      {/* Top Navigation Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '16px 24px', 
        backgroundColor: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <button 
          onClick={() => navigate('/admin-dashboard')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>

      <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        <RevenueAnalysis />
      </div>
    </div>
  );
};

export default RevenueAnalysisPage;
