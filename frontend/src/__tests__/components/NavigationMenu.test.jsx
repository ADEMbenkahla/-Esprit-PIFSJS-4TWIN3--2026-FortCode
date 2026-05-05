import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@radix-ui/react-navigation-menu', () => ({
  __esModule: true,
  Root: ({ children, ...props }) => (
    <div data-testid="navigation-menu-root" {...props}>
      {children}
    </div>
  ),
  List: ({ children, ...props }) => (
    <div data-testid="navigation-menu-list" {...props}>
      {children}
    </div>
  ),
  Item: ({ children, ...props }) => (
    <div data-testid="navigation-menu-item" {...props}>
      {children}
    </div>
  ),
  Trigger: ({ children, ...props }) => (
    <button type="button" data-testid="navigation-menu-trigger" {...props}>
      {children}
    </button>
  ),
  Content: ({ children, ...props }) => (
    <div data-testid="navigation-menu-content" {...props}>
      {children}
    </div>
  ),
  Viewport: ({ children, ...props }) => (
    <div data-testid="navigation-menu-viewport" {...props}>
      {children}
    </div>
  ),
  Link: ({ children, ...props }) => (
    <a data-testid="navigation-menu-link" {...props}>
      {children}
    </a>
  ),
  Indicator: ({ children, ...props }) => (
    <div data-testid="navigation-menu-indicator" {...props}>
      {children}
    </div>
  ),
}));

let NavigationMenu;
let NavigationMenuList;
let NavigationMenuItem;
let NavigationMenuTrigger;
let NavigationMenuContent;
let NavigationMenuViewport;

beforeAll(async () => {
  const module = await import('../../pages/frontOffice/components/ui/navigation-menu.tsx');
  NavigationMenu = module.NavigationMenu;
  NavigationMenuList = module.NavigationMenuList;
  NavigationMenuItem = module.NavigationMenuItem;
  NavigationMenuTrigger = module.NavigationMenuTrigger;
  NavigationMenuContent = module.NavigationMenuContent;
  NavigationMenuViewport = module.NavigationMenuViewport;
});

describe('NavigationMenu Component', () => {
  test('rend le menu de navigation avec trigger, content et viewport', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Menu</NavigationMenuTrigger>
            <NavigationMenuContent>Contenu</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    );

    expect(screen.getByTestId('navigation-menu-root')).toBeDefined();
    expect(screen.getByTestId('navigation-menu-list')).toBeDefined();
    expect(screen.getByTestId('navigation-menu-item')).toBeDefined();
    expect(screen.getByTestId('navigation-menu-trigger')).toBeDefined();
    expect(screen.getByTestId('navigation-menu-content')).toBeDefined();
    expect(screen.getByText(/Menu/i)).toBeDefined();
    expect(screen.getByText(/Contenu/i)).toBeDefined();
    expect(screen.getByTestId('navigation-menu-viewport')).toBeDefined();
  });
});
