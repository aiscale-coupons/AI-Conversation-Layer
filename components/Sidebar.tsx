import * as React from 'react';
import { NavLink } from 'react-router-dom';

interface IconProps {
  className?: string;
}

const LayoutDashboardIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>
  </svg>
);

const UsersIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline>
  </svg>
);

const ListOrderedIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" x2="21" y1="6" y2="6"></line><line x1="10" x2="21" y1="12" y2="12"></line><line x1="10" x2="21" y1="18" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
  </svg>
);

const GlobeIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const MessageCircleReplyIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="m10 7-3 3 3 3"></path><path d="M13 13v-1a2 2 0 0 0-2-2H7"></path>
  </svg>
);

// FIX: Replaced `JSX.Element` with `React.ReactElement` to resolve the "Cannot find namespace 'JSX'" error by explicitly using the imported React type.
const navItems: { path: string; label: string; icon: (props: IconProps) => React.ReactElement }[] = [
    { path: '/', label: 'Campaigns', icon: LayoutDashboardIcon },
    { path: '/contacts', label: 'Contacts', icon: UsersIcon },
    { path: '/sequences', label: 'Sequences', icon: ListOrderedIcon },
    { path: '/domains', label: 'Domains & Inboxes', icon: GlobeIcon },
    { path: '/responses', label: 'Response Manager', icon: MessageCircleReplyIcon },
];

const Sidebar = () => {
  return (
    <div className="w-64 bg-white border-r border-slate-200/80 p-4 flex flex-col">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="bg-teal-500 p-2 rounded-lg">
           <MessageCircleReplyIcon className="text-white w-6 h-6"/>
        </div>
        <h1 className="text-xl font-bold text-slate-900">AI ConvLayer</h1>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
            const Icon = item.icon;
            return (
                <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                        ? 'bg-teal-50 text-teal-600'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`
                    }
                >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                </NavLink>
            );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;