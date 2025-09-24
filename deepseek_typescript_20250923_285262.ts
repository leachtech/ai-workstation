import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Home, 
  FolderGit, 
  Workflow, 
  Brain, 
  Settings,
  Terminal
} from 'lucide-react';

const SidebarContainer = styled.div`
  width: 250px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
`;

const Logo = styled.div`
  padding: 0 20px 20px;
  border-bottom: 1px solid #333;
  margin-bottom: 20px;
  
  h1 {
    font-size: 1.5rem;
    background: linear-gradient(45deg, #00ff88, #00ccff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: bold;
  }
`;

const Nav = styled.nav`
  flex: 1;
`;

const NavList = styled.ul`
  list-style: none;
`;

const NavItem = styled.li<{ active?: boolean }>`
  margin: 5px 10px;
  
  a {
    display: flex;
    align-items: center;
    padding: 12px 15px;
    color: ${props => props.active ? '#00ff88' : '#ccc'};
    text-decoration: none;
    border-radius: 8px;
    background: ${props => props.active ? 'rgba(0, 255, 136, 0.1)' : 'transparent'};
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(0, 255, 136, 0.1);
      color: #00ff88;
    }
    
    svg {
      margin-right: 10px;
      width: 20px;
      height: 20px;
    }
  }
`;

const TerminalButton = styled.button`
  display: flex;
  align-items: center;
  padding: 12px 15px;
  margin: 10px;
  background: rgba(0, 204, 255, 0.1);
  color: #00ccff;
  border: 1px solid #00ccff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 204, 255, 0.2);
  }
  
  svg {
    margin-right: 10px;
    width: 20px;
    height: 20px;
  }
`;

interface SidebarProps {
  onToggleTerminal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onToggleTerminal }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/projects', icon: FolderGit, label: 'Projects' },
    { path: '/workflow', icon: Workflow, label: 'Workflow' },
    { path: '/ai-suggestions', icon: Brain, label: 'AI Suggestions' },
    { path: '/configuration', icon: Settings, label: 'Configuration' }
  ];

  return (
    <SidebarContainer>
      <Logo>
        <h1>AI Dev Workstation</h1>
      </Logo>
      
      <Nav>
        <NavList>
          {navItems.map(item => (
            <NavItem key={item.path} active={location.pathname === item.path}>
              <Link to={item.path}>
                <item.icon />
                {item.label}
              </Link>
            </NavItem>
          ))}
        </NavList>
      </Nav>
      
      <TerminalButton onClick={onToggleTerminal}>
        <Terminal />
        Toggle Terminal
      </TerminalButton>
    </SidebarContainer>
  );
};