import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import type { Session } from '@supabase/supabase-js';

import Sidebar from './components/Sidebar';
import CampaignsDashboard from './components/CampaignsDashboard';
import ContactsView from './components/ContactsView';
import SequenceBuilder from './components/SequenceBuilder';
import InfrastructureView from './components/InfrastructureView';
import ResponseManager from './components/ResponseManager';
import InboxesView from './components/InboxesView';
import InboxConnect from './components/InboxConnect';
import ContactListsView from './components/ContactListsView';

const MainLayout = ({ session }: { session: Session }) => (
  <div className="flex h-screen bg-slate-100 text-slate-800">
    <Sidebar />
    <main className="flex-1 p-6 md:p-8 overflow-y-auto">
      <Routes>
        <Route path="/" element={<CampaignsDashboard session={session} />} />
        <Route path="/contacts" element={<ContactsView session={session} />} />
        <Route path="/contact-lists" element={<ContactListsView />} />
        <Route path="/sequences" element={<SequenceBuilder session={session} />} />
        <Route path="/infrastructure" element={<InfrastructureView session={session} />} />
        <Route path="/inboxes" element={<InboxesView />} />
        <Route path="/inbox-connect" element={<InboxConnect />} />
        <Route path="/responses" element={<ResponseManager />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </main>
  </div>
);

const App = () => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase) return;

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!supabase) {
    return <div className="flex h-screen items-center justify-center p-8 text-center text-red-600 bg-red-50">
      <p>Supabase client is not configured. Please check your environment variables in <strong>.env.local</strong> and ensure they are correct.</p>
    </div>
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      {!session ? (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-md p-8">
                <h1 className="text-2xl font-bold text-center mb-4">AI Conversation Layer</h1>
                <Auth 
                    supabaseClient={supabase} 
                    appearance={{ theme: ThemeSupa }} 
                    providers={['google', 'github']}
                    theme="light"
                />
            </div>
        </div>
      ) : (
        <MainLayout session={session} />
      )}
    </>
  );
};

export default App;