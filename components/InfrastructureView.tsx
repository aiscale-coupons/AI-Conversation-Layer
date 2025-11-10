import * as React from 'react';
import { Domain, Inbox } from '../types';
import { supabase } from '../supabase/client';
import type { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Dialog, Transition } from '@headlessui/react';
import Spinner from './Spinner';
import DomainRecordsModal from './DomainRecordsModal';


const CheckCircle = ({className}: {className?: string}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const XCircle = ({className}: {className?: string}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
);

const inboxSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const domainSchema = z.object({
    name: z.string().min(3, { message: "Domain must be at least 3 characters." }).regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, { message: "Invalid domain format." }),
});

interface InfrastructureViewProps {
    session: Session;
}

const InfrastructureView = ({ session }: InfrastructureViewProps) => {
    const [domains, setDomains] = React.useState<Domain[]>([]);
    const [inboxes, setInboxes] = React.useState<Inbox[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    // State for View Records Modal
    const [selectedDomain, setSelectedDomain] = React.useState<Domain | null>(null);

    const [verifyingDomainId, setVerifyingDomainId] = React.useState<number | null>(null);


    React.useEffect(() => {
        const fetchData = async () => {
            if (!supabase) return;
            setLoading(true);
            const [domainsRes, inboxesRes] = await Promise.all([
                supabase.from('domains').select('*').order('created_at', { ascending: false }),
                supabase.from('inboxes').select('*')
            ]);

            if (domainsRes.error) {
                console.error("Error fetching domains:", domainsRes.error.message);
                toast.error("Could not fetch domains.");
            } else {
                setDomains(domainsRes.data || []);
            }

            if (inboxesRes.error) {
                console.error("Error fetching inboxes:", inboxesRes.error.message);
                toast.error("Could not fetch inboxes.");
            } else {
                const formattedInboxes = inboxesRes.data.map((i: any) => ({ ...i, dailyLimit: i.daily_limit }));
                setInboxes(formattedInboxes);
            }
            
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleAddDomain = async () => {
        if (!supabase || !session?.user) return;

        const validation = domainSchema.safeParse({ name: newDomainName });
        if (!validation.success) {
            toast.error(validation.error.issues[0].message);
            return;
        }

        const { data: newDomain, error } = await supabase
            .from('domains')
            .insert({ 
                name: newDomainName,
                user_id: session.user.id, // FIX: Add the user_id to satisfy RLS policy
                spf: false,
                dkim: false,
                dmarc: false,
            })
            .select()
            .single();
        
        if (error) {
            console.error("Error adding domain:", error);
            if (error.code === '23505') { // Handle unique constraint violation
                toast.error("This domain has already been registered.");
            } else {
                toast.error(`Failed to add domain: ${error.message}`);
            }
        } else if (newDomain) {
            setDomains([newDomain, ...domains]);
            toast.success("Domain added successfully!");
            setIsDomainModalOpen(false);
            setNewDomainName("");
        }
    };
    
    const handleVerifyDomain = async (domainToVerify: Domain) => {
        if (!supabase) return;

        setVerifyingDomainId(domainToVerify.id);
        const toastId = toast.loading(`Verifying ${domainToVerify.name}...`);
        
        // Simulate a backend call to a service that checks DNS records.
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: updatedDomain, error } = await supabase
            .from('domains')
            .update({ spf: true, dkim: true, dmarc: true })
            .eq('id', domainToVerify.id)
            .select()
            .single();

        if (error) {
            console.error("Error verifying domain:", error.message);
            toast.error("Verification failed.", { id: toastId });
        } else if (updatedDomain) {
            setDomains(domains.map(d => d.id === updatedDomain.id ? updatedDomain : d));
            toast.success(`${updatedDomain.name} verified successfully!`, { id: toastId });
        }
        setVerifyingDomainId(null);
    };

    const handleConnectInbox = async () => {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            toast.error("You must be logged in to connect an inbox.");
            return;
        }

        try {
            const response = await fetch('https://ypxntquggvgjbukgzkjw.supabase.co/functions/v1/google-auth-start', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (response.ok && response.redirected) {
                window.location.href = response.url;
            } else {
                const errorData = await response.json();
                console.error('Error from google-auth-start:', errorData);
                toast.error(`Failed to start inbox connection: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            toast.error("An unexpected error occurred. See console for details.");
            console.error('Full error object:', error);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                <h2 className="text-3xl font-bold text-slate-900">Infrastructure</h2>
                <p className="text-slate-500 mt-1">Manage your sending domains and connected inboxes.</p>
                </div>
            </header>

            <div className="bg-white rounded-lg border border-slate-200/80">
                <div className="p-5 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Domain Verification</h3>
                        <p className="text-sm text-slate-500">Add domains and verify their DNS records to improve deliverability.</p>
                    </div>
                     <button onClick={() => setIsDomainModalOpen(true)} className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-md transition-colors">
                        Add Domain
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Domain</th>
                            <th scope="col" className="px-6 py-3 text-center">SPF</th>
                            <th scope="col" className="px-6 py-3 text-center">DKIM</th>
                            <th scope="col" className="px-6 py-3 text-center">DMARC</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-8">
                                    <div className="flex justify-center items-center">
                                        <Spinner />
                                    </div>
                                </td>
                            </tr>
                        ) : domains.length === 0 ? (
                             <tr>
                                <td colSpan={5} className="text-center p-8 text-slate-500">No domains found. Add one to get started.</td>
                            </tr>
                        ) : domains.map(domain => (
                            <tr key={domain.id} className="bg-white border-b border-slate-200/80 hover:bg-slate-50">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{domain.name}</th>
                                <td className="px-6 py-4 text-center">{domain.spf ? <CheckCircle className="w-5 h-5 text-green-500 inline"/> : <XCircle className="w-5 h-5 text-red-500 inline"/>}</td>
                                <td className="px-6 py-4 text-center">{domain.dkim ? <CheckCircle className="w-5 h-5 text-green-500 inline"/> : <XCircle className="w-5 h-5 text-red-500 inline"/>}</td>
                                <td className="px-6 py-4 text-center">{domain.dmarc ? <CheckCircle className="w-5 h-5 text-green-500 inline"/> : <XCircle className="w-5 h-5 text-red-500 inline"/>}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => setSelectedDomain(domain)} className="text-sm font-medium text-teal-600 hover:text-teal-500">View Records</button>
                                        <button 
                                            onClick={() => handleVerifyDomain(domain)} 
                                            disabled={verifyingDomainId === domain.id}
                                            className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {verifyingDomainId === domain.id ? <Spinner size="sm" /> : 'Verify'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200/80">
                <div className="p-5 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Connected Inboxes</h3>
                        <p className="text-sm text-slate-500">Inboxes used for sending and rotation.</p>
                    </div>
                    <button onClick={handleConnectInbox} className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                        Connect New Inbox
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Email Address</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Daily Limit</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                             <tr>
                                <td colSpan={3} className="p-8">
                                    <div className="flex justify-center items-center">
                                        <Spinner />
                                    </div>
                                </td>
                            </tr>
                        ) : inboxes.map(inbox => (
                            <tr key={inbox.id} className="bg-white border-b border-slate-200/80 hover:bg-slate-50">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{inbox.email}</th>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                                        inbox.status === 'active' ? 'bg-green-500/20 text-green-600' :
                                        inbox.status === 'warming' ? 'bg-blue-500/20 text-blue-600' : 'bg-red-500/20 text-red-600'
                                    }`}>
                                        {inbox.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{inbox.dailyLimit}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Domain Modal */}
            <Transition appear show={isDomainModalOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-10" onClose={() => setIsDomainModalOpen(false)}>
                    <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/30" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">Add New Domain</Dialog.Title>
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        value={newDomainName}
                                        onChange={(e) => setNewDomainName(e.target.value)}
                                        placeholder="e.g., yourcompany.com"
                                        className="w-full bg-slate-50 border-slate-300 rounded-md shadow-sm p-2 text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsDomainModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-md transition-colors">Cancel</button>
                                    <button type="button" onClick={handleAddDomain} className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">Add Domain</button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <DomainRecordsModal 
                isOpen={!!selectedDomain}
                onClose={() => setSelectedDomain(null)}
                domain={selectedDomain}
            />
        </div>
    );
};

export default InfrastructureView;