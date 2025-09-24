import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
`;

const Title = styled.h2`
  color: #00ccff;
  margin-bottom: 20px;
  font-size: 1.5rem;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
`;

const ActionButton = styled.button`
  background: rgba(0, 204, 255, 0.1);
  border: 1px solid #00ccff;
  color: #00ccff;
  padding: 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;

  &:hover {
    background: rgba(0, 204, 255, 0.2);
    transform: translateY(-1px);
  }
`;

export const QuickActions: React.FC = () => {
  const actions = [
    { label: 'Clone New Repository', action: () => console.log('Clone repo') },
    { label: 'Run Security Scan', action: () => console.log('Security scan') },
    { label: 'Generate AI Suggestions', action: () => console.log('AI suggestions') },
    { label: 'Deploy Project', action: () => console.log('Deploy') }
  ];

  return (
    <Container>
      <Title>Quick Actions</Title>
      <ActionGrid>
        {actions.map((action, index) => (
          <ActionButton key={index} onClick={action.action}>
            {action.label}
          </ActionButton>
        ))}
      </ActionGrid>
    </Container>
  );
};