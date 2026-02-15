import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

    const connect = (token: string) => {
        if (socket) socket.disconnect();

        const newSocket = io('http://localhost:5000', {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Global Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Global Socket disconnected');
            setIsConnected(false);
        });

        setSocket(newSocket);
    };

    const disconnect = () => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            connect(token);
        }
        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
            {children}
        </SocketContext.Provider>
    );
};
