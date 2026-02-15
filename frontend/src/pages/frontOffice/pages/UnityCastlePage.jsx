import React from 'react';
import { UnityCastle } from '../components/unity/UnityCastle';
import { useNavigate } from 'react-router-dom';

export const UnityCastlePage = () => {
  const navigate = useNavigate();

  // Mock user progress - replace with real data from your backend
  const userProgress = {
    level1: { completed: [1, 2], total: 6 },
    level2: { completed: [], total: 6 },
    level3: { completed: [], total: 6 },
    level4: { completed: [], total: 6 }
  };

  const handleLayerClick = (layerId) => {
    console.log('Navigating to:', layerId);
    // Navigate to the challenges page for that layer
    navigate(`/level/${layerId}`);
  };

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <UnityCastle 
        userProgress={userProgress}
        onLayerClick={handleLayerClick}
      />
    </div>
  );
};
