import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, ListChecks, Rocket, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/tasks', label: 'Tasks', icon: ListChecks },
  { path: '/boost', label: 'Boost', icon: Rocket },
  { path: '/referrals', label: 'Friends', icon: Users },
  { path: '/leaderboard', label: 'Top', icon: Trophy },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white/70 backdrop-blur-sm border-t border-gray-200">
      <div className="grid grid-cols-5 max-w-lg mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-2 text-sm font-medium transition-colors',
                isActive ? 'text-brand-yellow' : 'text-gray-500 hover:text-brand-yellow'
              )
            }
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;