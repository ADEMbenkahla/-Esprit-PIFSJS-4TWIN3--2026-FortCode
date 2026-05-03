import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@radix-ui/react-dropdown-menu', () => ({
  __esModule: true,
  Root: ({ children, ...props }) => (
    <div data-testid="dropdown-root" {...props}>{children}</div>
  ),
  Portal: ({ children, ...props }) => (
    <div data-testid="dropdown-portal" {...props}>{children}</div>
  ),
  Trigger: ({ children, ...props }) => (
    <button type="button" data-testid="dropdown-trigger" {...props}>{children}</button>
  ),
  Content: ({ children, ...props }) => (
    <div data-testid="dropdown-content" {...props}>{children}</div>
  ),
  Group: ({ children, ...props }) => (
    <div data-testid="dropdown-group" {...props}>{children}</div>
  ),
  Item: ({ children, ...props }) => (
    <div data-testid="dropdown-item" {...props}>{children}</div>
  ),
  CheckboxItem: ({ children, checked, ...props }) => (
    <label data-testid="dropdown-checkbox-item" {...props}>
      <input type="checkbox" checked={checked} readOnly />
      {children}
    </label>
  ),
  RadioGroup: ({ children, ...props }) => (
    <div data-testid="dropdown-radio-group" {...props}>{children}</div>
  ),
  RadioItem: ({ children, ...props }) => (
    <div data-testid="dropdown-radio-item" {...props}>{children}</div>
  ),
  Label: ({ children, ...props }) => (
    <div data-testid="dropdown-label" {...props}>{children}</div>
  ),
  Separator: (props) => <div data-testid="dropdown-separator" {...props} />,
  ItemIndicator: ({ children, ...props }) => (
    <span data-testid="dropdown-item-indicator" {...props}>{children}</span>
  ),
  Sub: ({ children, ...props }) => (
    <div data-testid="dropdown-sub" {...props}>{children}</div>
  ),
  SubTrigger: ({ children, ...props }) => (
    <button type="button" data-testid="dropdown-sub-trigger" {...props}>{children}</button>
  ),
  SubContent: ({ children, ...props }) => (
    <div data-testid="dropdown-sub-content" {...props}>{children}</div>
  ),
}));

let DropdownMenu;
let DropdownMenuTrigger;
let DropdownMenuContent;
let DropdownMenuItem;

describe('DropdownMenu Component', () => {
  beforeAll(async () => {
    const module = await import('../../pages/frontOffice/components/ui/dropdown-menu.tsx');
    DropdownMenu = module.DropdownMenu;
    DropdownMenuTrigger = module.DropdownMenuTrigger;
    DropdownMenuContent = module.DropdownMenuContent;
    DropdownMenuItem = module.DropdownMenuItem;
  });

  test('rend le menu déroulant et ses éléments', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Option 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    expect(screen.getByTestId('dropdown-root')).toBeDefined();
    expect(screen.getByTestId('dropdown-trigger')).toBeDefined();
    expect(screen.getByTestId('dropdown-content')).toBeDefined();
    expect(screen.getByText(/Option 1/i)).toBeDefined();
  });
});
