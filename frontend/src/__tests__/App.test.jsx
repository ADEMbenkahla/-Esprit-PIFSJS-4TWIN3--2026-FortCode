import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

test('L\'application se render sans erreur', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
});