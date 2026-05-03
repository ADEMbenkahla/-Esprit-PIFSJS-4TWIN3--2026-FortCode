import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '../../pages/frontOffice/components/ui/breadcrumb';

describe('Breadcrumb Component', () => {
  test('rend correctement le fil d’Ariane avec lien et page actuelle', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/home">Accueil</BreadcrumbLink>
            <BreadcrumbSeparator />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Tableau de bord</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeDefined();
    expect(screen.getByText(/Accueil/i)).toBeDefined();
    expect(screen.getByText(/Tableau de bord/i)).toBeDefined();
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });

  test('rend l’ellipse quand elle est utilisée', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/home">Accueil</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Page actuelle</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );

    expect(screen.getByText(/Page actuelle/i)).toBeDefined();
    expect(screen.getByText(/More/i)).toBeDefined();
  });
});
