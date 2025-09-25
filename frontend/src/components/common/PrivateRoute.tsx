import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface PrivateRouteProps {
  children: React.ReactNode;
}

/**
 * Guards access to child elements based on authentication state, showing a loading spinner while authentication is pending and redirecting unauthenticated users to the login page.
 *
 * @param children - Elements to render when the user is authenticated
 * @returns The protected `children` when authenticated; a `LoadingSpinner` while authentication is loading; otherwise a `Navigate` element that redirects to `/login` with the current location saved in `state`
 */
export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}