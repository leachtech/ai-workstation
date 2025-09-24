import React from 'react';
import styled from 'styled-components';

const Card = styled.div<{ color: string }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #333;
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${props => props.color};
  }
`;

const Icon = styled.div`
  font-size: 2rem;
  margin-bottom: 10px;
`;

const Title = styled.h3`
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Value = styled.div<{ color: string }>`
  color: ${props => props.color};
  font-size: 2rem;
  font-weight: bold;
`;

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
  return (
    <Card color={color}>
      <Icon>{icon}</Icon>
      <Title>{title}</Title>
      <Value color={color}>{value}</Value>
    </Card>
  );
};