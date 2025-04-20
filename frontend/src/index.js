import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import App from './App';

// 定制主题
const theme = extendTheme({
  colors: {
    primary: {
      50: '#e6f6ff',
      100: '#cce8ff',
      200: '#99c8ff',
      300: '#66a8ff',
      400: '#3388ff',
      500: '#0066FF',
      600: '#0052cc',
      700: '#003d99',
      800: '#002966',
      900: '#001433',
    },
  },
  fonts: {
    heading: '"Noto Sans SC", sans-serif',
    body: '"Noto Sans SC", sans-serif',
  },
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
); 