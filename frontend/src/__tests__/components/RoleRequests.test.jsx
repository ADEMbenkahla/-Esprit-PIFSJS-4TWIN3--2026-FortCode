// src/__tests__/components/RoleRequests.test.jsx
import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RoleRequests from '../../pages/backOffice/RoleRequests';
import api from '../../services/api';

// Mock des API
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

// Mock des composants
vi.mock('../../pages/backOffice/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar Mock</div>
}));

vi.mock('../../pages/backOffice/components/Header', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  )
}));

describe('RoleRequests Page - Tests', () => {
  const mockRequests = [
    {
      _id: '1',
      userId: {
        _id: 'user1',
        username: 'john_doe',
        email: 'john@example.com',
        nickname: 'John',
        avatar: 'https://example.com/avatar1.jpg'
      },
      justification: 'I have 5 years of recruiting experience',
      proofDocument: '/uploads/proof-documents/doc1.pdf',
      status: 'pending',
      createdAt: '2024-01-15T10:00:00Z',
      aiDecision: null,
      aiExplanation: null,
      documentScore: null,
      textScore: null,
      adminComment: null
    },
    {
      _id: '2',
      userId: {
        _id: 'user2',
        username: 'jane_smith',
        email: 'jane@example.com',
        nickname: 'Jane',
        avatar: 'https://example.com/avatar2.jpg'
      },
      justification: 'HR professional with 3 years experience',
      proofDocument: null,
      status: 'approved',
      createdAt: '2024-01-14T10:00:00Z',
      aiDecision: 'ACCEPT',
      aiExplanation: 'Strong justification and profile',
      documentScore: 0.85,
      textScore: 0.9,
      adminComment: 'Approved by admin',
      reviewedAt: '2024-01-16T10:00:00Z'
    },
    {
      _id: '3',
      userId: {
        _id: 'user3',
        username: 'bob_wilson',
        email: 'bob@example.com',
        nickname: 'Bob',
        avatar: null
      },
      justification: 'Looking for new opportunities',
      proofDocument: null,
      status: 'rejected',
      createdAt: '2024-01-13T10:00:00Z',
      aiDecision: 'REJECT',
      aiExplanation: 'Insufficient experience',
      documentScore: 0.3,
      textScore: 0.4,
      adminComment: 'Rejected - need more experience',
      reviewedAt: '2024-01-15T10:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { requests: mockRequests } });
  });

  const renderWithRouter = (component) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  // ✅ TEST 1: Affiche la liste - chercher par prénom (nickname)
  test('1. Affiche la liste des demandes', async () => {
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  // ✅ TEST 2: Filtrage par statut
  test('2. Filtre les demandes par statut', async () => {
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
    
    const approvedFilter = screen.getByRole('button', { name: /Approved/i });
    fireEvent.click(approvedFilter);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/role-requests', { params: { status: 'approved' } });
    });
  });

  // ✅ TEST 3: Badge de statut
  test('3. Affiche le badge de statut correct', async () => {
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  // ✅ TEST 4: Compteur des demandes en attente
  test('4. Affiche le compteur des demandes en attente', async () => {
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      const pendingButton = screen.getByRole('button', { name: /Pending/i });
      expect(pendingButton).toBeInTheDocument();
      // Vérifier que le span avec le chiffre 1 existe
      expect(pendingButton.querySelector('span')).toHaveTextContent('1');
    });
  });

  // ✅ TEST 5: Scores AI
  test('5. Affiche les scores AI pour les demandes analysées', async () => {
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      const explanation = screen.getByText(/Strong justification and profile/i);
      expect(explanation).toBeInTheDocument();
    });
  });

  // ✅ TEST 6: Lance l'analyse AI
  test('6. Lance l\'analyse AI', async () => {
    api.post.mockResolvedValue({ data: { message: 'AI analysis completed' } });
    
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
    
    const aiButtons = screen.getAllByRole('button', { name: /Launch AI Auto-Analysis/i });
    fireEvent.click(aiButtons[0]);
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/role-requests/1/ai-review');
    });
  });

  // ✅ TEST 7: Approuver une demande
  test('7. Approuve une demande', async () => {
    api.put.mockResolvedValue({ data: { message: 'Request approved' } });
    
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
    
    const approveButtons = screen.getAllByRole('button', { name: /Accepter/i });
    fireEvent.click(approveButtons[0]);
    
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/role-requests/1/approve', expect.any(Object));
    });
  });

  // ✅ TEST 8: Rejeter une demande
  test('8. Rejette une demande', async () => {
    api.put.mockResolvedValue({ data: { message: 'Request rejected' } });
    
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });
    
    const rejectButtons = screen.getAllByRole('button', { name: /Rejeter/i });
    fireEvent.click(rejectButtons[0]);
    
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/role-requests/1/reject', expect.any(Object));
    });
  });

  // ✅ TEST 9: Message d'erreur
  test('9. Affiche un message d\'erreur en cas d\'échec', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));
    
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading requests')).toBeInTheDocument();
    });
  });

  // ✅ TEST 10: Commentaire admin
  test('10. Affiche le commentaire admin pour les demandes traitées', async () => {
    renderWithRouter(<RoleRequests />);
    
    await waitFor(() => {
      expect(screen.getByText('Approved by admin')).toBeInTheDocument();
      expect(screen.getByText('Rejected - need more experience')).toBeInTheDocument();
    });
  });
});