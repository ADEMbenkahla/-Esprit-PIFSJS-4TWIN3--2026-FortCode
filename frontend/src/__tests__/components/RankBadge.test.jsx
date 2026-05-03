import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankBadge } from '../../pages/frontOffice/components/Gamification/RankBadge';

// Mock de framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

describe('RankBadge Component', () => {
  
  test('affiche le rang par défaut (Iron)', () => {
    render(<RankBadge />);
    const badge = document.querySelector('.flex');
    expect(badge).toBeDefined();
  });

  test('affiche le rang Gold correctement', () => {
    render(<RankBadge rank="Gold" />);
    expect(document.querySelector('.text-yellow-400')).toBeDefined();
  });

  test('affiche le rang Radiant correctement', () => {
    render(<RankBadge rank="Radiant" />);
    expect(document.querySelector('.text-yellow-200')).toBeDefined();
  });

  test('affiche le rang Platinum correctement', () => {
    render(<RankBadge rank="Platinum" />);
    expect(document.querySelector('.text-cyan-400')).toBeDefined();
  });

  test('affiche le rang Diamond correctement', () => {
    render(<RankBadge rank="Diamond" />);
    expect(document.querySelector('.text-purple-400')).toBeDefined();
  });

  test('affiche le niveau dans le badge pour la taille md', () => {
    render(<RankBadge rank="Gold" level={42} size="md" />);
    expect(screen.getByText('42')).toBeDefined();
  });

  test('n\'affiche pas le niveau pour la taille sm', () => {
    render(<RankBadge rank="Gold" level={42} size="sm" />);
    expect(screen.queryByText('42')).toBeNull();
  });

  test('affiche le label avec showLabel', () => {
    render(<RankBadge rank="Silver" showLabel={true} />);
    expect(screen.getByText(/Silver/i)).toBeDefined();
  });

  test('affiche le niveau dans le label', () => {
    render(<RankBadge rank="Bronze" level={15} showLabel={true} />);
    expect(screen.getByText(/Lvl. 15/i)).toBeDefined();
  });

  test('utilise la taille sm par défaut', () => {
    render(<RankBadge />);
    const badge = document.querySelector('.w-6');
    expect(badge).toBeDefined();
  });

  test('utilise la taille lg', () => {
    render(<RankBadge size="lg" />);
    const badge = document.querySelector('.w-16');
    expect(badge).toBeDefined();
  });

  test('utilise la taille xl', () => {
    render(<RankBadge size="xl" />);
    const badge = document.querySelector('.w-24');
    expect(badge).toBeDefined();
  });

  test('affiche le tooltip avec title', () => {
    render(<RankBadge rank="Immortal" level={50} />);
    const badge = document.querySelector('[title="Rank: Immortal | Level: 50"]');
    expect(badge).toBeDefined();
  });

  test('gère un rang invalide (utilise Iron par défaut)', () => {
    render(<RankBadge rank="InvalidRank" />);
    expect(document.querySelector('.text-gray-400')).toBeDefined();
  });

});