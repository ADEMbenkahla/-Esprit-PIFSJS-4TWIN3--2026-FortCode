import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../pages/frontOffice/components/ui/badge';

describe('Badge Component', () => {
  test('rend un badge par défaut avec le bon texte', () => {
    render(<Badge>Par défaut</Badge>);

    expect(screen.getByText(/Par défaut/i)).toBeDefined();
    expect(screen.getByText(/Par défaut/i).tagName).toBe('SPAN');
  });

  test('rend un badge avec une variante outline', () => {
    render(<Badge variant="outline">Outline</Badge>);

    expect(screen.getByText(/Outline/i)).toBeDefined();
  });

  test('rend un badge en tant que lien quand asChild est vrai', () => {
    render(
      <Badge asChild>
        <a href="/test">Lien</a>
      </Badge>
    );

    expect(screen.getByText(/Lien/i)).toBeDefined();
    expect(screen.getByRole('link', { name: /Lien/i })).toHaveAttribute('href', '/test');
  });
});
