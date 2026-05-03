import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dialog, DialogTrigger, DialogContent } from '../../pages/frontOffice/components/ui/dialog.tsx';

describe('Dialog component', () => {
  test('renders dialog trigger and content', () => {
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>Dialog content</DialogContent>
      </Dialog>,
    );

    expect(screen.getByText(/Open dialog/i)).toBeDefined();
  });
});
