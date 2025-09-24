import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Workflow } from './pages/Workflow';
import { AISuggestions } from './pages/AISuggestions';
import { Configuration } from './pages/Configuration';
import { Terminal } from './components/Terminal';
import { AppProvider } from './contexts/AppContext';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #0f0f23;
    color: #fff;
    overflow: hidden;
  }

  #root {
    height: 100vh;
    display: flex;
  }
`;

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
`;

const TerminalContainer = styled.div`
  height: 300px;
  border-top: 1px solid #333;
`;

function App() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onWorkflowLog((event, message) => {
        setTerminalLogs(prev => [...prev, message]);
      });
    }
  }, []);

  return (
    <AppProvider>
      <GlobalStyle />
      <Router>
        <AppContainer>
          <Sidebar onToggleTerminal={() => setShowTerminal(!showTerminal)} />
          <MainContent>
            <ContentArea>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/workflow" element={<Workflow />} />
                <Route path="/ai-suggestions" element={<AISuggestions />} />
                <Route path="/configuration" element={<Configuration />} />
              </Routes>
            </ContentArea>
            {showTerminal && (
              <TerminalContainer>
                <Terminal logs={terminalLogs} />
              </TerminalContainer>
            )}
          </MainContent>
        </AppContainer>
      </Router>
    </AppProvider>
  );
}

export default App;