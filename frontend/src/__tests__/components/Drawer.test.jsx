import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Drawer, DrawerTrigger, DrawerContent } from '../../pages/frontOffice/components/ui/drawer.tsx';

describe('Drawer component', () => {
  test('renders drawer trigger', () => {
    render(
      <Drawer>
        <DrawerTrigger>Open drawer</DrawerTrigger>
        <DrawerContent>Drawer content</DrawerContent>
      </Drawer>,
    );

    expect(screen.getByText(/Open drawer/i)).toBeDefined();
  });
});
