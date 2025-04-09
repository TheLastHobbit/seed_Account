import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { darkTheme } from './styles/theme';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SeedAccountPage from './pages/SeedAccountPage';
import ShadowAccountPage from './pages/ShadowAccountPage';
import Navbar from './components/Navbar';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/seed-account" element={<SeedAccountPage />} />
          <Route path="/shadow-account" element={<ShadowAccountPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App; 