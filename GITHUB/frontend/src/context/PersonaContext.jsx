import { createContext, useState, useContext } from 'react';

const PersonaContext = createContext();

export function PersonaProvider({ children }) {
  const [persona, setPersona] = useState('ceo');
  const [role, setRole] = useState('ceo');

  const updatePersona = (newPersona) => {
    setPersona(newPersona);
    setRole(newPersona); // Assuming role matches persona for simplicity based on mock data
  };

  return (
    <PersonaContext.Provider value={{ persona, role, setPersona: updatePersona }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  return useContext(PersonaContext);
}
