import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import RouteProtegee from './composants/RouteProtegee';
import Accueil from './pages/Acceuil';
import Chambres from './pages/Chambres';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import MesReservations from './pages/MesReservations';
import Recherche from './pages/Recherche';
import Reservation from './pages/Reservation';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Accueil /> },
      { path: 'chambres', element: <Chambres /> },
      { path: 'connexion', element: <Connexion /> },
      { path: 'inscription', element: <Inscription /> },
      { path: 'recherche', element: <Recherche /> },
      {
        path: 'reserver/:id',
        element: (
          <RouteProtegee>
            <Reservation />
          </RouteProtegee>
        ),
      },
      {
        path: 'mes-reservations',
        element: (
          <RouteProtegee>
            <MesReservations />
          </RouteProtegee>
        ),
      },
      {
        path: '*',
        element: (
          <section className="simple-page">
            <h1>Page introuvable</h1>
            <p>L’adresse demandée ne correspond à aucune page.</p>
          </section>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);