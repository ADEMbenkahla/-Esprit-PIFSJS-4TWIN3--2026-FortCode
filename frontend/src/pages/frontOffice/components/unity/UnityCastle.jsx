import React, { useState, useEffect } from 'react';
import { Unity, useUnityContext } from "react-unity-webgl";

export const UnityCastle = ({ userProgress, onLayerClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const { unityProvider, sendMessage, addEventListener, removeEventListener, loadingProgression } = useUnityContext({
    loaderUrl: "/unity/fort.loader.js",
    dataUrl: "/unity/fort.data",
    frameworkUrl: "/unity/fort.framework.js",
    codeUrl: "/unity/fort.wasm",
  });

  // Track loading progress
  useEffect(() => {
    // Intentionally updating state from Unity's loading progression
    // eslint-disable-next-line
    setProgress(loadingProgression * 100);
    if (!isLoaded && loadingProgression >= 1) {
      setIsLoaded(true);
    }
  }, [loadingProgression, isLoaded]);

  // Listen for messages from Unity
  useEffect(() => {
    const handleLoaded = () => {
      console.log("Unity castle loaded!");
      setIsLoaded(true);
    };

    const handleLayerSelected = (layerId) => {
      console.log("Layer selected in Unity:", layerId);
      if (onLayerClick) {
        onLayerClick(layerId);
      }
    };

    addEventListener("loaded", handleLoaded);
    addEventListener("LayerSelected", handleLayerSelected);
    
    return () => {
      removeEventListener("loaded", handleLoaded);
      removeEventListener("LayerSelected", handleLayerSelected);
    };
  }, [addEventListener, removeEventListener, onLayerClick]);

  // Send user progress to Unity when loaded
  useEffect(() => {
    if (isLoaded && userProgress) {
      sendMessage("ProgressManager", "SyncProgress", JSON.stringify(userProgress));
    }
  }, [isLoaded, userProgress, sendMessage]);

  // Gestionnaire d'erreurs
  useEffect(() => {
    const handleError = (event) => {
      console.error('Unity error:', event);
      setError('Failed to load Unity content');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div style={{ color: '#E74C3C', textAlign: 'center', padding: '50px' }}>
        <h2>❌ Error loading castle</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh',
      background: '#f9fafb'
    }}>
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#111827',
          zIndex: 10,
          background: '#ffffff',
          padding: '30px',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)'
        }}>
          <h2>🏰 Loading FortCode Castle...</h2>
          <div style={{
            width: '300px',
            height: '20px',
            background: '#e5e7eb',
            borderRadius: '10px',
            marginTop: '20px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3498DB, #9B59B6)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{ color: '#374151', marginTop: '10px' }}>
            {Math.round(progress)}% - Please wait...
          </p>
        </div>
      )}
      
      <Unity 
        unityProvider={unityProvider} 
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block',
          visibility: isLoaded ? 'visible' : 'hidden',
          background: '#f9fafb'
        }}
      />
    </div>
  );
};