import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/store/authStore';

interface UseAuthOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
  requiredUserType?: 'buyer' | 'seller' | 'admin';
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  hasPermission: (requiredType: 'buyer' | 'seller' | 'admin') => boolean;
  isUserType: (type: 'buyer' | 'seller' | 'admin') => boolean;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const {
    redirectTo,
    redirectIfFound = false,
    requiredUserType
  } = options;

  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser
  } = useAuthStore();

  useEffect(() => {
    // Redirecionar se usuário não está autenticado e é necessário
    if (!isLoading && !isAuthenticated && redirectTo && !redirectIfFound) {
      navigate(redirectTo);
      return;
    }

    // Redirecionar se usuário está autenticado e não deveria estar
    if (!isLoading && isAuthenticated && redirectTo && redirectIfFound) {
      navigate(redirectTo);
      return;
    }

    // Verificar se usuário tem o tipo necessário
    if (!isLoading && isAuthenticated && user && requiredUserType) {
      if (user.userType !== requiredUserType && user.userType !== 'admin') {
        navigate('/unauthorized');
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, redirectTo, redirectIfFound, requiredUserType, navigate]);

  // Função para verificar permissões
  const hasPermission = (requiredType: 'buyer' | 'seller' | 'admin'): boolean => {
    if (!user) return false;
    
    // Admin tem acesso a tudo
    if (user.userType === 'admin') return true;
    
    // Verificar tipo específico
    return user.userType === requiredType;
  };

  // Função para verificar tipo específico do usuário
  const isUserType = (type: 'buyer' | 'seller' | 'admin'): boolean => {
    return user?.userType === type;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    hasPermission,
    isUserType
  };
}

// Hook específico para proteger páginas
export function useRequireAuth(requiredUserType?: 'buyer' | 'seller' | 'admin') {
  return useAuth({
    redirectTo: '/auth/login',
    requiredUserType
  });
}

// Hook para redirecionar usuários autenticados (ex: páginas de login)
export function useRedirectIfAuthenticated(redirectTo: string = '/') {
  return useAuth({
    redirectTo,
    redirectIfFound: true
  });
}

// Hook para verificar se usuário é admin
export function useRequireAdmin() {
  return useAuth({
    redirectTo: '/auth/login',
    requiredUserType: 'admin'
  });
}

// Hook para verificar se usuário é vendedor
export function useRequireSeller() {
  return useAuth({
    redirectTo: '/auth/login',
    requiredUserType: 'seller'
  });
}

// Hook para verificar se usuário é comprador
export function useRequireBuyer() {
  return useAuth({
    redirectTo: '/auth/login',
    requiredUserType: 'buyer'
  });
}