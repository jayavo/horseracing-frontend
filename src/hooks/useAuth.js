import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hr_token');
    const username = localStorage.getItem('hr_user');
    if (token && username) setUser({ username, token });
    setLoading(false);
  }, []);

  async function login(username, password) {
    const res = await apiLogin(username, password);
    const { token, username: u } = res.data;
    localStorage.setItem('hr_token', token);
    localStorage.setItem('hr_user', u);
    setUser({ username: u, token });
    return res.data;
  }

  function logout() {
    localStorage.removeItem('hr_token');
    localStorage.removeItem('hr_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
