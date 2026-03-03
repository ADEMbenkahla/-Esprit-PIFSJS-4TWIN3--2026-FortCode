import React, { useState, useEffect, useRef } from 'react';
import { UnityCastle } from '../components/unity/UnityCastle';
import { useNavigate, useLocation } from 'react-router-dom';
import './UnityCastleAnimation.css';

export const UnityCastlePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProgress, setUserProgress] = useState({
    level1: false,
    level2: false,
    level3: false,
    level4: false
  });
  const [newlyUnlocked, setNewlyUnlocked] = useState(null);
  const hasShownBuildFxOnLoad = useRef(false);

  const castleNames = {
    level1: 'Blue Castle',
    level2: 'Red Castle',
    level3: 'Brown Castle',
    level4: 'Purple Castle'
  };

  const getLatestUnlocked = (progress) => {
    if (progress.level4) return 'level4';
    if (progress.level3) return 'level3';
    if (progress.level2) return 'level2';
    if (progress.level1) return 'level1';
    return null;
  };

  const loadProgress = () => {
    const levelProgress = JSON.parse(localStorage.getItem('levelProgress') || '{}');
    const nextProgress = {
      level1: Boolean(levelProgress.level1),
      level2: Boolean(levelProgress.level2),
      level3: Boolean(levelProgress.level3),
      level4: Boolean(levelProgress.level4)
    };
    setUserProgress(nextProgress);

    if (!hasShownBuildFxOnLoad.current && !location.state?.completedLevel) {
      const latestUnlocked = getLatestUnlocked(nextProgress);
      if (latestUnlocked) {
        hasShownBuildFxOnLoad.current = true;
        setNewlyUnlocked(latestUnlocked);
        setTimeout(() => setNewlyUnlocked(null), 3000);
      }
    }
  };

  // Load level completion from localStorage
  useEffect(() => {
    loadProgress();

    const handleReset = () => {
      setNewlyUnlocked(null);
      loadProgress();
    };

    window.addEventListener("fortcode:progress-reset", handleReset);
    return () => window.removeEventListener("fortcode:progress-reset", handleReset);
  }, []);

  // Detect newly completed level from navigation state
  useEffect(() => {
    if (location.state?.completedLevel) {
      setNewlyUnlocked(location.state.completedLevel);
      loadProgress();
      setTimeout(() => setNewlyUnlocked(null), 3000);
      // Clear the state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleLayerClick = (layerId) => {
    console.log('Navigating to:', layerId);
    const levelNumber = layerId.replace('level', '');
    navigate(`/training/${levelNumber}`);
  };



  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <UnityCastle 
        userProgress={userProgress}
        onLayerClick={handleLayerClick}
      />

      {/* Unlock Animation */}
      {newlyUnlocked && (
        <div className="castle-unlock-animation">
          <div className="castle-unlock-content">
            <div className="castle-build-glow" />
            <div className="castle-build-runes" />
            <div className="castle-build-particles" />
            <div className="castle-unlock-icon">🏰</div>
            <h2>{castleNames[newlyUnlocked]} Unlocked!</h2>
            <p>Your fortress layer is now being built...</p>
          </div>
        </div>
      )}
    </div>
  );
};
