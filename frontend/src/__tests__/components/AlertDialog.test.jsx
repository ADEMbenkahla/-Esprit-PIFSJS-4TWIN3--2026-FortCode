import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../pages/frontOffice/components/ui/button', () => ({
  buttonVariants: vi.fn(() => 'btn'),
}));

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../pages/frontOffice/components/ui/alert-dialog';

describe('AlertDialog Component', () => {
  test('ouvre le dialogue et affiche le titre et la description', async () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Ouvrir le dialogue</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Titre du dialogue</AlertDialogTitle>
            <AlertDialogDescription>Description du dialogue</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    const trigger = screen.getByText(/Ouvrir le dialogue/i);
    expect(trigger).toBeDefined();

    expect(screen.queryByText(/Titre du dialogue/i)).toBeNull();
    expect(screen.queryByText(/Description du dialogue/i)).toBeNull();

    await userEvent.click(trigger);

    expect(screen.getByText(/Titre du dialogue/i)).toBeDefined();
    expect(screen.getByText(/Description du dialogue/i)).toBeDefined();
    expect(screen.getByText(/Annuler/i)).toBeDefined();
    expect(screen.getByText(/Confirmer/i)).toBeDefined();
  });
});
