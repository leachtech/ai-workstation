import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
`;

const Title = styled.h2`
  color: #00ff88;
  margin-bottom: 20px;
  font-size: 1.5rem;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border-left: 3px solid #00ff88;
`;

const ActivityIcon = styled.div`
  font-size: 1.2rem;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTime = styled.div`
  color: #666;
  font-size: 0.8rem;
`;

export const ActivityFeed: React.FC = () => {
  const activities = [
    { icon: '⚡', text: 'Workflow completed successfully', time: '2 minutes ago' },
    { icon: '🔧', text: 'Security scan passed', time: '5 minutes ago' },
    { icon: '📦', text: 'Project deployed to Netlify', time: '10 minutes ago' },
    { icon: '🤖', text: 'AI suggestions generated', time: '15 minutes ago' }
  ];

  return (
    <Container>
      <Title>Recent Activity</Title>
      <ActivityList>
        {activities.map((activity, index) => (
          <ActivityItem key={index}>
            <ActivityIcon>{activity.icon}</ActivityIcon>
            <ActivityContent>
              <div>{activity.text}</div>
              <ActivityTime>{activity.time}</ActivityTime>
            </ActivityContent>
          </ActivityItem>
        ))}
      </ActivityList>
    </Container>
  );
};