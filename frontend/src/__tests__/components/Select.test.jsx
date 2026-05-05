import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from '../../pages/frontOffice/components/ui/select';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock pour les animations
global.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('Select Component - Tests Complets', () => {
  
  // ==================== TESTS D'EXPORT ====================
  test('1. exporte Select', () => {
    expect(Select).toBeDefined();
  });

  test('2. exporte SelectContent', () => {
    expect(SelectContent).toBeDefined();
  });

  test('3. exporte SelectGroup', () => {
    expect(SelectGroup).toBeDefined();
  });

  test('4. exporte SelectItem', () => {
    expect(SelectItem).toBeDefined();
  });

  test('5. exporte SelectLabel', () => {
    expect(SelectLabel).toBeDefined();
  });

  test('6. exporte SelectTrigger', () => {
    expect(SelectTrigger).toBeDefined();
  });

  test('7. exporte SelectValue', () => {
    expect(SelectValue).toBeDefined();
  });

  test('8. exporte SelectSeparator', () => {
    expect(SelectSeparator).toBeDefined();
  });

  test('9. exporte SelectScrollUpButton', () => {
    expect(SelectScrollUpButton).toBeDefined();
  });

  test('10. exporte SelectScrollDownButton', () => {
    expect(SelectScrollDownButton).toBeDefined();
  });

  // ==================== TESTS DE RENDU ====================

  test('11. rend un Select de base', () => {
    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Sélectionner..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByTestId('trigger')).toBeInTheDocument();
    expect(screen.getByText('Sélectionner...')).toBeInTheDocument();
  });

  test('12. applique les classes CSS au trigger', () => {
    render(
      <Select>
        <SelectTrigger className="custom-trigger" data-testid="trigger">
          <SelectValue placeholder="Test" />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByTestId('trigger')).toHaveClass('custom-trigger');
  });

  test('13. applique la taille "sm" au trigger', () => {
    render(
      <Select>
        <SelectTrigger size="sm" data-testid="trigger">
          <SelectValue placeholder="Small" />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByTestId('trigger')).toHaveAttribute('data-size', 'sm');
  });

  test('14. applique la taille "default" au trigger', () => {
    render(
      <Select>
        <SelectTrigger size="default" data-testid="trigger">
          <SelectValue placeholder="Default" />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByTestId('trigger')).toHaveAttribute('data-size', 'default');
  });



  // ==================== TEST D'ÉTAT DÉSACTIVÉ ====================

  test('20. Select désactivé', () => {
    render(
      <Select disabled>
        <SelectTrigger disabled data-testid="trigger">
          <SelectValue placeholder="Désactivé" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="item">Item</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByTestId('trigger')).toBeDisabled();
  });

  // ==================== TEST DE VALEUR PAR DÉFAUT ====================

  test('21. affiche une valeur par défaut', () => {
    render(
      <Select value="option2">
        <SelectTrigger>
          <SelectValue placeholder="Choisir" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });


  // ==================== TESTS DE FRACTURE ====================

  test('23. ne plante pas avec des options vides', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Vide" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
    expect(true).toBe(true);
  });
});