import React from 'react';
import styled from 'styled-components';
import { useApp } from '../contexts/AppContext';
import { MetricCard } from '../components/MetricCard';
import { ActivityFeed } from '../components/ActivityFeed';
import { QuickActions } from '../components/QuickActions';

const DashboardContainer = styled.div`
  padding: 20px;
`;

const Header = styled.div`
  margin-bottom: 30px;
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    background: linear-gradient(45deg, #00ff88, #00ccff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  p {
    color: #ccc;
    font-size: 1.1rem;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
`;

export const Dashboard: React.FC = () => {
  const { projects, config, workflowStatus } = useApp();

  const metrics = [
    {
      title: 'Total Projects',
      value: projects.length.toString(),
      icon: '📁',
      color: '#00ff88'
    },
    {
      title: 'Workflow Status',
      value: workflowStatus.charAt(0).toUpperCase() + workflowStatus.slice(1),
      icon: '⚡',
      color: workflowStatus === 'running' ? '#ffcc00' : 
             workflowStatus === 'success' ? '#00ff88' : '#ff4444'
    },
    {
      title: 'AI Provider',
      value: config?.ai?.preferredProvider || 'Not configured',
      icon: '🤖',
      color: '#00ccff'
    },
    {
      title: 'GitHub Status',
      value: config?.github?.token ? 'Connected' : 'Disconnected',
      icon: '🔗',
      color: config?.github?.token ? '#00ff88' : '#ff4444'
    }
  ];

  return (
    <DashboardContainer>
      <Header>
        <h1>Development Dashboard</h1>
        <p>Monitor your projects and workflows in real-time</p>
      </Header>
      
      <MetricsGrid>
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </MetricsGrid>
      
      <ContentGrid>
        <ActivityFeed />
        <QuickActions />
      </ContentGrid>
    </DashboardContainer>
  );
};