import * as React from 'react';
import { supabase } from '../supabase/client';
import { Inbox } from '../types';
import toast from 'react-hot-toast';
import Spinner from './Spinner';

const InboxesView = () => {
    const [inboxes, setInboxes] = React.useState<Inbox[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchInboxes = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('inboxes').select('*');
        if (error) {
            toast.error('Failed to fetch inboxes.');
            console.error(error);
        } else {
            setInboxes(data);
        }
        setLoading(false);
    };

    React.useEffect(() => {
        fetchInboxes();
    }, []);

    const handleConnectInbox = () => {
        // Redirect to the google-auth-start Edge Function
        const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
        if (!functionsUrl) {
            toast.error("Functions URL is not configured. Please check your environment variables.");
            return;
        }
        window.location.href = `${functionsUrl}/google-auth-start`;
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Manage Inboxes</h2>
                    <p className="text-slate-500 mt-1">Connect and manage your Google Workspace inboxes.</p>
                </div>
                <button
                    onClick={handleConnectInbox}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                >
                    Connect New Inbox
                </button>
            </header>

            <div className="bg-white rounded-lg border border-slate-200/80">
                <div className="p-5">
                    <h3 className="text-lg font-semibold text-slate-900">Connected Inboxes</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Daily Limit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center"><Spinner /></td>
                                </tr>
                            ) : inboxes.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-500">No inboxes connected yet.</td>
                                </tr>
                            ) : (
                                inboxes.map((inbox) => (
                                    <tr key={inbox.id} className="bg-white border-b border-slate-200/80 hover:bg-slate-50">
                                        <th scope="row" className="px-6 py-4 font-medium text-slate-900">{inbox.email}</th>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                inbox.is_connected ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
                                            }`}>
                                                {inbox.is_connected ? 'Connected' : 'Disconnected'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{inbox.daily_send_limit}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InboxesView;
