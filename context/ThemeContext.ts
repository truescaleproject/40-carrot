
import { createContext, useContext } from 'react';
import { Theme, defaultTheme } from '../styles/themes';

export const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({
    theme: defaultTheme,
    setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);
