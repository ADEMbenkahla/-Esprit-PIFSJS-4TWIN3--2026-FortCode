import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SocketProvider, useSocket } from '../../context/SocketContext';

// Mock de socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  })),
}));

// Mock des services token
vi.mock('../../services/token', () => ({
  getStoredToken: vi.fn(),
  isTokenExpired: vi.fn(),
  clearStoredAuth: vi.fn(),
}));

import { io } from 'socket.io-client';
import { getStoredToken, isTokenExpired, clearStoredAuth } from '../../services/token';

// Composant de test pour utiliser le contexte
const TestComponent = () => {
  const { socket, isConnected, connect, disconnect } = useSocket();
  return (
    <div>
      <div data-testid="connected">{isConnected ? 'true' : 'false'}</div>
      <div data-testid="socket-exists">{socket ? 'true' : 'false'}</div>
      <button onClick={() => connect('test-token')} data-testid="connect-btn">Connect</button>
      <button onClick={disconnect} data-testid="disconnect-btn">Disconnect</button>
    </div>
  );
};

describe('SocketContext', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('fournit le contexte avec les valeurs par défaut', () => {
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );
    
    expect(screen.getByTestId('connected').textContent).toBe('false');
    expect(screen.getByTestId('socket-exists').textContent).toBe('false');
  });

  test('connect est appelable sans erreur', () => {
    getStoredToken.mockReturnValue('valid-token');
    isTokenExpired.mockReturnValue(false);
    
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );
    
    const connectBtn = screen.getByTestId('connect-btn');
    expect(() => connectBtn.click()).not.toThrow();
  });

  test('disconnect est appelable sans erreur', () => {
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );
    
    const disconnectBtn = screen.getByTestId('disconnect-btn');
    expect(() => disconnectBtn.click()).not.toThrow();
  });

  test('le hook useSocket peut être utilisé', () => {
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );
    
    expect(screen.getByTestId('connected')).toBeDefined();
  });

});