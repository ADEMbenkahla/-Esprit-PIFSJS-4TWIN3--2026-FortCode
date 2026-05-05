import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../pages/frontOffice/components/ui/Card.tsx';

describe('Card Component', () => {
  test('rend le Card avec le contenu enfant', () => {
    render(<Card>Contenu du Card</Card>);

    expect(screen.getByText(/Contenu du Card/i)).toBeDefined();
  });

  test('rend la variante neon correctement', () => {
    render(<Card variant="neon">Neon</Card>);

    expect(screen.getByText(/Neon/i)).toBeDefined();
  });

  test('rend les sous-composants CardHeader, CardTitle, CardDescription, CardContent et CardFooter', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Titre</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Contenu principal</CardContent>
        <CardFooter>Pied de page</CardFooter>
      </Card>
    );

    expect(screen.getByText(/Titre/i)).toBeDefined();
    expect(screen.getByText(/Description/i)).toBeDefined();
    expect(screen.getByText(/Contenu principal/i)).toBeDefined();
    expect(screen.getByText(/Pied de page/i)).toBeDefined();
  });
});
