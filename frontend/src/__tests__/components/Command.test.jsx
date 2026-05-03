import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock complet de cmdk avec des composants valides
vi.mock('cmdk', () => {
  const React = require('react');
  
  const CommandRoot = ({ children, className, ...props }) => (
    React.createElement('div', { 'data-testid': 'command-root', className, ...props }, children)
  );
  
  const CommandInput = ({ placeholder, value, onValueChange, ...props }) => (
    React.createElement('input', {
      'data-testid': 'command-input',
      placeholder,
      value,
      onChange: (e) => onValueChange?.(e.target.value),
      ...props
    })
  );
  
  const CommandList = ({ children, ...props }) => (
    React.createElement('div', { 'data-testid': 'command-list', ...props }, children)
  );
  
  const CommandEmpty = ({ children, ...props }) => (
    React.createElement('div', { 'data-testid': 'command-empty', ...props }, children)
  );
  
  const CommandGroup = ({ children, heading, ...props }) => (
    React.createElement('div', { 'data-testid': 'command-group', ...props },
      heading && React.createElement('div', { 'data-testid': 'command-group-heading' }, heading),
      children
    )
  );
  
  const CommandItem = ({ children, onSelect, disabled, ...props }) => (
    React.createElement('button', {
      'data-testid': 'command-item',
      onClick: onSelect,
      disabled,
      ...props
    }, children)
  );
  
  const CommandSeparator = (props) => (
    React.createElement('hr', { 'data-testid': 'command-separator', ...props })
  );
  
  return {
    Command: CommandRoot,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandSeparator,
  };
});

// Mock du Dialog
vi.mock('../../pages/frontOffice/components/ui/dialog.tsx', () => {
  const React = require('react');
  return {
    Dialog: ({ children, open }) => open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
    DialogContent: ({ children }) => React.createElement('div', { 'data-testid': 'dialog-content' }, children),
    DialogHeader: ({ children }) => React.createElement('div', { 'data-testid': 'dialog-header' }, children),
    DialogTitle: ({ children }) => React.createElement('div', { 'data-testid': 'dialog-title' }, children),
    DialogDescription: ({ children }) => React.createElement('div', { 'data-testid': 'dialog-description' }, children),
  };
});

// Import des composants APRÈS les mocks
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '../../pages/frontOffice/components/ui/command.tsx';

describe('Command Component - Tests', () => {
  
  // ==================== TESTS D'EXPORT ====================
  test('1. Command est exporté', () => {
    expect(Command).toBeDefined();
  });

  test('2. CommandDialog est exporté', () => {
    expect(CommandDialog).toBeDefined();
  });

  test('3. CommandInput est exporté', () => {
    expect(CommandInput).toBeDefined();
  });

  test('4. CommandList est exporté', () => {
    expect(CommandList).toBeDefined();
  });

  test('5. CommandEmpty est exporté', () => {
    expect(CommandEmpty).toBeDefined();
  });

  test('6. CommandGroup est exporté', () => {
    expect(CommandGroup).toBeDefined();
  });

  test('7. CommandItem est exporté', () => {
    expect(CommandItem).toBeDefined();
  });

  test('8. CommandSeparator est exporté', () => {
    expect(CommandSeparator).toBeDefined();
  });

  // ==================== TESTS DE RENDU ====================
  test('9. rend le composant Command', () => {
    render(<Command />);
    expect(screen.getByTestId('command-root')).toBeInTheDocument();
  });

  test('10. applique les classes CSS', () => {
    render(<Command className="custom-class" />);
    expect(screen.getByTestId('command-root')).toHaveClass('custom-class');
  });

  
  // ==================== TESTS DE COMMAND_DIALOG ====================
  test('20. CommandDialog n\'est pas rendu quand open=false', () => {
    render(<CommandDialog open={false}>Contenu</CommandDialog>);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  test('21. CommandDialog est rendu quand open=true', () => {
    render(<CommandDialog open={true}>Contenu</CommandDialog>);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });
});