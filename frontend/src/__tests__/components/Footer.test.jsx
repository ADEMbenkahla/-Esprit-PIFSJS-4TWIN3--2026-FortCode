import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Footer } from '../../pages/frontOffice/components/layout/Footer';

describe('Footer Component', () => {
  
  test('affiche le nom FortCode (au moins une occurrence)', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    
    const fortCodeText = screen.getAllByText(/FortCode/i);
    expect(fortCodeText.length).toBeGreaterThan(0);
  });

  test('affiche l\'année en cours', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(currentYear.toString()))).toBeDefined();
  });

  test('affiche le texte de description', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Master programming through strategic challenges/i)).toBeDefined();
  });

  test('affiche les liens de navigation', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Home/i)).toBeDefined();
    expect(screen.getByText(/Training Grounds/i)).toBeDefined();
    expect(screen.getByText(/Battle Arena/i)).toBeDefined();
    expect(screen.getByText(/Dashboard/i)).toBeDefined();
  });

  test('affiche le lien GitHub', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    
    const githubLink = screen.getByLabelText(/GitHub/i);
    expect(githubLink).toBeDefined();
    expect(githubLink.getAttribute('href')).toBe('https://github.com');
  });

  test('affiche le lien email', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    
    const emailLink = screen.getByLabelText(/Email/i);
    expect(emailLink).toBeDefined();
    expect(emailLink.getAttribute('href')).toBe('mailto:contact@fortcode.com');
  });

  test('affiche le texte "Made with"', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/Made with/i)).toBeDefined();
  });

  test('affiche le lien de support', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );
    
    const supportLink = screen.getByText(/Contact Support/i);
    expect(supportLink).toBeDefined();
    expect(supportLink.getAttribute('href')).toBe('/settings');
  });

});