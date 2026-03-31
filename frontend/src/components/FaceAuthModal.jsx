import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { X, Camera, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

const FaceAuthModal = ({ isOpen, onClose, onCapture, mode = 'register', email = '' }) => {
    const webcamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState('Initializing models...');
    const [error, setError] = useState(null);

    // Load models on mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models_v2';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                setStatus('Ready to scan');
            } catch (err) {
                console.error('Error loading face-api models:', err);
                setError('Failed to load face detection models. Please check your internet connection.');
            }
        };
        if (isOpen) {
            loadModels();
        }
    }, [isOpen]);

    const handleCapture = useCallback(async () => {
        if (!webcamRef.current) return;

        setIsCapturing(true);
        setStatus('Detecting face...');
        setError(null);

        try {
            const video = webcamRef.current.video;
            const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                setStatus('Face captured! Verified.');
                // Convert Float32Array to regular array for JSON serialization
                const descriptorArray = Array.from(detections.descriptor);
                onCapture(descriptorArray);
                setTimeout(onClose, 1500);
            } else {
                setError('No face detected. Please ensure you are in a well-lit area and looking directly at the camera.');
                setStatus('Ready to scan');
            }
        } catch (err) {
            console.error('Capture error:', err);
            setError('An error occurred during scanning. Please try again.');
        } finally {
            setIsCapturing(false);
        }
    }, [webcamRef, onCapture, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-serif font-bold text-slate-100">
                            {mode === 'register' ? 'Register Face ID' : 'Face ID Login'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-800 aspect-video flex items-center justify-center">
                        {modelsLoaded ? (
                            <>
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{ facingMode: 'user' }}
                                />
                                {/* Scanning Animation Overlays */}
                                <div className="absolute inset-0 pointer-events-none border-2 border-purple-500/30 rounded-xl">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500/50 animate-scan shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                                <p className="text-slate-400 font-medium">Loading models...</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className={`flex items-center gap-3 p-4 rounded-xl border ${error ? 'bg-red-900/10 border-red-500/20' : 'bg-slate-800/50 border-slate-700'
                            }`}>
                            {error ? (
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            ) : (
                                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                            )}
                            <p className={`text-sm ${error ? 'text-red-400' : 'text-slate-300'}`}>
                                {error || status}
                            </p>
                        </div>

                        <button
                            onClick={handleCapture}
                            disabled={!modelsLoaded || isCapturing}
                            className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-purple-500/20"
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)',
                                opacity: (!modelsLoaded || isCapturing) ? 0.7 : 1,
                                cursor: (!modelsLoaded || isCapturing) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isCapturing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Capturing...
                                </>
                            ) : (
                                <>
                                    <Camera className="w-6 h-6" />
                                    {mode === 'register' ? 'Register Face' : 'Verify Face'}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer info */}
                <div className="p-4 bg-slate-950/50 border-t border-slate-800">
                    <p className="text-xs text-center text-slate-500">
                        Scanning stays local. Only an anonymous numerical fingerprint is sent to our servers.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FaceAuthModal;
