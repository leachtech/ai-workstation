import React from 'react';
import styled from 'styled-components';

const TerminalContainer = styled.div`
  background: #1a1a1a;
  color: #00ff00;
  font-family: 'Courier New', monospace;
  height: 100%;
  padding: 15px;
  overflow-y: auto;
`;

const TerminalLine = styled.div`
  margin-bottom: 5px;
  font-size: 0.9rem;
`;

interface TerminalProps {
  logs: string[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  return (
    <TerminalContainer>
      {logs.map((log, index) => (
        <TerminalLine key={index}>
          <span style={{ color: '#666' }}>$ </span>
          {log}
        </TerminalLine>
      ))}
    </TerminalContainer>
  );
};