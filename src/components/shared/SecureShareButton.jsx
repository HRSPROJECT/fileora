import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Share2 } from 'lucide-react'
import { useShare } from '../../context/ShareContext'

export default function SecureShareButton({ file, fileName, style }) {
  const navigate = useNavigate();
  const { setFileToShare } = useShare();

  const handleShareDirectly = () => {
    if (!file) return;
    
    // Create a File object from Blob if needed
    const fileObj = file instanceof File 
      ? file 
      : new File([file], fileName || 'shared-file', { type: file.type || 'application/octet-stream' });
      
    setFileToShare(fileObj);
    navigate('/share');
  };

  return (
    <button 
      type="button"
      onClick={handleShareDirectly}
      className="btn btn-secondary"
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '8px', 
        padding: '14px', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: 600,
        ...style 
      }}
    >
      <Share2 size={16} style={{ color: 'var(--accent-primary)' }} />
      <span>Share Directly (P2P)</span>
    </button>
  );
}
