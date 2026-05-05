import { describe, test, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock complet d'axios
vi.mock('axios', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPut = vi.fn();
  const mockPatch = vi.fn();
  const mockDelete = vi.fn();
  
  const mockInstance = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
    delete: mockDelete,
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() }
    }
  };
  
  return {
    default: {
      create: vi.fn(() => mockInstance)
    }
  };
});

// Importer après le mock
import api, { 
  getBattleInvitationPreview,
  acceptBattleInvitation,
  requestVirtualRoom,
  getMyVirtualRoomRequest,
  deleteMyAccount,
  getParticipants,
  generateBattleExercise,
  createBattleRoom,
  getMyBattleRooms,
  getBattleRoom,
  updateBattleRoomStatus,
  stagesApi,
  adminStagesApi,
  adminChallengesApi,
  getDuelMatchDetails,
  getCurrentMatch
} from '../../services/api';

describe('API Service', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  test('api est défini', () => {
    expect(api).toBeDefined();
  });

  test('getBattleInvitationPreview - fonctionne', () => {
    getBattleInvitationPreview('test-token');
    expect(api.get).toHaveBeenCalled();
  });

  test('acceptBattleInvitation - fonctionne', () => {
    acceptBattleInvitation({ id: '123' });
    expect(api.post).toHaveBeenCalled();
  });

  test('requestVirtualRoom - fonctionne', () => {
    requestVirtualRoom({ name: 'room' });
    expect(api.post).toHaveBeenCalled();
  });

  test('getMyVirtualRoomRequest - fonctionne', () => {
    getMyVirtualRoomRequest();
    expect(api.get).toHaveBeenCalled();
  });

  test('deleteMyAccount - fonctionne', () => {
    deleteMyAccount({ confirm: true });
    expect(api.delete).toHaveBeenCalled();
  });

  test('getParticipants - fonctionne', () => {
    getParticipants();
    expect(api.get).toHaveBeenCalled();
  });

  test('generateBattleExercise - fonctionne', () => {
    generateBattleExercise({ topic: 'JS' });
    expect(api.post).toHaveBeenCalled();
  });

  test('createBattleRoom - fonctionne', () => {
    createBattleRoom({ title: 'Battle' });
    expect(api.post).toHaveBeenCalled();
  });

  test('getMyBattleRooms - fonctionne', () => {
    getMyBattleRooms();
    expect(api.get).toHaveBeenCalled();
  });

  test('getBattleRoom - fonctionne', () => {
    getBattleRoom('room-123');
    expect(api.get).toHaveBeenCalled();
  });

  test('updateBattleRoomStatus - fonctionne', () => {
    updateBattleRoomStatus('room-123', 'active');
    expect(api.patch).toHaveBeenCalled();
  });

  test('stagesApi.me - fonctionne', () => {
    stagesApi.me();
    expect(api.get).toHaveBeenCalled();
  });

  test('stagesApi.get - fonctionne', () => {
    stagesApi.get('stage-123');
    expect(api.get).toHaveBeenCalled();
  });

  test('adminStagesApi.list - fonctionne', () => {
    adminStagesApi.list();
    expect(api.get).toHaveBeenCalled();
  });

  test('adminChallengesApi.list - fonctionne', () => {
    adminChallengesApi.list();
    expect(api.get).toHaveBeenCalled();
  });

  test('getDuelMatchDetails - fonctionne', () => {
    getDuelMatchDetails('match-123');
    expect(api.get).toHaveBeenCalled();
  });

  test('getCurrentMatch - fonctionne', () => {
    getCurrentMatch();
    expect(api.get).toHaveBeenCalled();
  });

});