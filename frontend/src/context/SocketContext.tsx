import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '../config';
import { clearStoredAuth, getStoredToken, isTokenExpired } from '../services/token';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connect: (token: string) => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    connect: () => { },
    disconnect: () => { },
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const connect = useCallback((token: string) => {
        if (!token || isTokenExpired(token)) {
            clearStoredAuth();
            setIsConnected(false);
            setSocket(null);
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
            return;
        }

        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        const newSocket = io(BACKEND_URL, {
            auth: { token },
            reconnection: false,
        });

        newSocket.on('connect', () => {
            console.log('Global Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Global Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            const message = (error && error.message) || 'Socket connection failed';
            console.error('Global socket connect error:', message);
            if (message.toLowerCase().includes('unauthorized')) {
                clearStoredAuth();
                if (window.location.pathname !== '/') {
                    window.location.href = '/';
                }
            }
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
        }
    }, []);

    useEffect(() => {
        const token = getStoredToken();
        if (token) {
            connect(token);
        }
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [connect]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
            {children}
        </SocketContext.Provider>
    );
};
