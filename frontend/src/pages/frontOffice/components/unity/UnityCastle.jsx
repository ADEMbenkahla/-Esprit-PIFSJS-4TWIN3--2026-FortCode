import React, { useState, useEffect } from 'react';
import { Unity, useUnityContext } from "react-unity-webgl";

export const UnityCastle = ({ userProgress, onLayerClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [loadStalled, setLoadStalled] = useState(false);

  const unityBaseUrl = `${import.meta.env.BASE_URL}unity/fortC`;
  const { unityProvider, sendMessage, addEventListener, removeEventListener, loadingProgression } = useUnityContext({
    loaderUrl: `${unityBaseUrl}.loader.js`,
    dataUrl: `${unityBaseUrl}.data`,
    frameworkUrl: `${unityBaseUrl}.framework.js`,
    codeUrl: `${unityBaseUrl}.wasm`,
  });

  // Track loading progress
  useEffect(() => {
    if (typeof loadingProgression === 'number' && !Number.isNaN(loadingProgression)) {
      setProgress(prev => {
        if (prev !== loadingProgression * 100) {
          return loadingProgression * 100;
        }
        return prev;
      });
      if (!isLoaded && loadingProgression >= 1) {
        setIsLoaded(true);
      }
    }
  }, [loadingProgression, isLoaded]);

  // Detect load stall to avoid a blank screen when Unity never initializes
  useEffect(() => {
    if (isLoaded) {
      if (loadStalled) {
        setLoadStalled(false);
      }
      return undefined;
    }

    const timer = setTimeout(() => {
      setLoadStalled(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [isLoaded, loadStalled]);

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
      const progressData = JSON.stringify(userProgress);
      console.log('🏰 Sending progress to Unity:', progressData);

      let attempts = 0;
      let timerId;

      const trySync = () => {
        attempts += 1;
        sendMessage("ProgressManager", "SyncProgress", progressData);
        if (attempts < 5) {
          timerId = setTimeout(trySync, 700);
        }
      };

      trySync();

      return () => {
        if (timerId) {
          clearTimeout(timerId);
        }
      };
    }
    return undefined;
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
          {loadStalled && (
            <p style={{ color: '#9B1C1C', marginTop: '10px', fontWeight: 600 }}>
              Loading is taking too long. Check the browser console for Unity errors.
            </p>
          )}
        </div>
      )}
      
      <Unity 
        unityProvider={unityProvider} 
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block',
          opacity: isLoaded ? 1 : 0.001,
          background: '#f9fafb'
        }}
      />
    </div>
  );
};