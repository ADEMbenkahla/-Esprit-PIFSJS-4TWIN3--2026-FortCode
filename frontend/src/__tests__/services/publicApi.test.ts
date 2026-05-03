import { describe, test, expect, vi } from 'vitest';
import publicApi from '../../services/publicApi';

describe('publicApi Service', () => {
  
  test('publicApi est défini', () => {
    expect(publicApi).toBeDefined();
  });

  test('publicApi a les méthodes HTTP', () => {
    expect(publicApi.get).toBeDefined();
    expect(publicApi.post).toBeDefined();
    expect(publicApi.put).toBeDefined();
    expect(publicApi.delete).toBeDefined();
  });

  test('publicApi.get est une fonction', () => {
    expect(typeof publicApi.get).toBe('function');
  });

  test('publicApi.post est une fonction', () => {
    expect(typeof publicApi.post).toBe('function');
  });

});