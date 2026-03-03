import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Lock } from 'lucide-react';
import './TrainingLevel.css';

export const TrainingLevel = () => {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const levelKey = `level${levelId}`;

  // Mock challenges data
  const challenges = [
    { id: 1, title: 'Challenge 1: Variables', description: 'Learn variable declaration and assignment' },
    { id: 2, title: 'Challenge 2: Data Types', description: 'Understand strings, numbers, and booleans' },
    { id: 3, title: 'Challenge 3: Conditionals', description: 'Master if/else statements and logic' },
    { id: 4, title: 'Challenge 4: Loops', description: 'Loop through arrays and objects' },
    { id: 5, title: 'Challenge 5: Functions', description: 'Write reusable and modular functions' },
    { id: 6, title: 'Challenge 6: Final Project', description: 'Complete your level capstone project' }
  ];

  const levelNames = ['Blue Castle', 'Red Castle', 'Brown Castle', 'Purple Castle'];
  const levelColors = ['#63b3ed', '#f87171', '#d97706', '#a78bfa'];

  // Load progress from localStorage
  const [completed, setCompleted] = useState(() => {
    const saved = localStorage.getItem(`${levelKey}_challenges`);
    return saved ? JSON.parse(saved) : [];
  });

  const [levelComplete, setLevelComplete] = useState(false);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem(`${levelKey}_challenges`, JSON.stringify(completed));
    
    // Check if all challenges completed
    if (completed.length === challenges.length && completed.length > 0) {
      setLevelComplete(true);
      // Save level completion
      const levelProgress = JSON.parse(localStorage.getItem('levelProgress') || '{}');
      if (!levelProgress[levelKey]) {
        levelProgress[levelKey] = true;
        localStorage.setItem('levelProgress', JSON.stringify(levelProgress));
      }
    }
  }, [completed, levelKey, challenges.length]);

  const toggleChallenge = (challengeId) => {
    setCompleted((prev) => {
      if (prev.includes(challengeId)) {
        return prev.filter((id) => id !== challengeId);
      }
      return [...prev, challengeId];
    });
  };

  const progress = Math.round((completed.length / challenges.length) * 100);

  return (
    <div className="training-level-page">
      <div className="training-level-container">
        {/* Header */}
        <div className="training-level-header">
          <button
            className="training-back-btn"
            onClick={() => navigate('/map')}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Map
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{ 
                width: '4px', 
                height: '60px', 
                background: levelColors[Number(levelId) - 1],
                borderRadius: '4px',
                boxShadow: `0 0 20px ${levelColors[Number(levelId) - 1]}`
              }} 
            />
            <div>
              <h1 className="training-level-title">Level {levelId}</h1>
              <p className="training-level-subtitle">
                {levelNames[Number(levelId) - 1]} - Complete all 6 challenges
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="training-progress-section">
          <div className="training-progress-header">
            <span className="training-progress-label">Progress</span>
            <span className="training-progress-percent">{progress}%</span>
          </div>
          <div className="training-progress-bar">
            <div
              className="training-progress-fill"
              style={{ width: `${progress}%`, background: levelColors[Number(levelId) - 1] }}
            />
          </div>
          <div className="training-progress-count">
            {completed.length} / {challenges.length} challenges completed
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="training-challenges">
          {challenges.map((challenge) => {
            const isCompleted = completed.includes(challenge.id);
            return (
              <div
                key={challenge.id}
                className={`training-challenge ${isCompleted ? 'completed' : ''}`}
                onClick={() => toggleChallenge(challenge.id)}
              >
                <div className="training-challenge-icon">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div className="training-challenge-content">
                  <h3 className="training-challenge-title">{challenge.title}</h3>
                  <p className="training-challenge-desc">{challenge.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Level Complete Banner */}
        {levelComplete && (
          <div className="training-complete-banner">
            <div className="training-complete-content">
              <div className="training-complete-icon">🏰</div>
              <div>
                <h2 className="training-complete-title">Level {levelId} Complete!</h2>
                <p className="training-complete-text">
                  Your {levelNames[Number(levelId) - 1]} is now being built!
                </p>
              </div>
              <button
                className="training-complete-btn"
                onClick={() => navigate('/castle', { state: { completedLevel: levelKey } })}
              >
                View Castle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
