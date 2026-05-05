export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  role: 'ADMIN' | 'VENDEDOR';
}

export interface AuthResponse extends AuthTokens {
  user: User;
}
