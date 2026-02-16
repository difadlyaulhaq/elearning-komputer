// app/blocked/page.tsx
import React from 'react';

const BlockedPage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: '20px',
      backgroundColor: '#f8f8f8',
      color: '#333'
    }}>
      <h1 style={{ fontSize: '2.5em', color: '#d9534f' }}>Akses Ditolak</h1>
      <p style={{ fontSize: '1.2em', maxWidth: '600px' }}>
        Mohon maaf, website ini hanya dapat diakses dari perangkat desktop.
        Silakan gunakan komputer atau laptop Anda untuk melanjutkan.
      </p>
      <p style={{ fontSize: '1em', color: '#666' }}>
        Terima kasih atas pengertiannya.
      </p>
    </div>
  );
};

export default BlockedPage;
