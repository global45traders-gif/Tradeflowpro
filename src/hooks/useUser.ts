import { useState, useEffect } from 'react';

export function useUser() {
  const [name, setName] = useState(() =>
    localStorage.getItem('tradeflow_user_name') || 'Trader'
  );

  useEffect(() => {
    const handler = () => {
      setName(localStorage.getItem('tradeflow_user_name') || 'Trader');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const updateName = (newName: string) => {
    setName(newName);
    localStorage.setItem('tradeflow_user_name', newName);
  };

  return { name, updateName };
}
