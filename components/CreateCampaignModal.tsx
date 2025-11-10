import * as React from 'react';
import { supabase } from '../supabase/client';
import { Campaign, SequenceListItem, ContactList } from '../types';
import type { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Dialog, Transition } from '@headlessui/react';


const campaignSchema = z.object({
  name: z.string().min(3, { message: "Campaign name must be at least 3 characters long." }),
  contactList: z.string().min(1, { message: "Please select a contact list." }),
  sequenceId: z.string().min(1, { message: "Please select a sequence." }),
});

interface CreateCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session;
    sequences: SequenceListItem[];
    contactLists: ContactList[];
    onCampaignCreated: (campaign: Campaign) => void;
}

export const CreateCampaignModal = ({
    isOpen,
    onClose,
    session,
    sequences,
    contactLists,
    onCampaignCreated
}: CreateCampaignModalProps) => {
    const [newCampaignName, setNewCampaignName] = React.useState('');
    const [selectedContactList, setSelectedContactList] = React.useState(contactLists[0]?.name || '');
    const [selectedSequence, setSelectedSequence] = React.useState(sequences[0]?.id.toString() || '');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        const validation = campaignSchema.safeParse({
            name: newCampaignName,
            contactList: selectedContactList,
            sequenceId: selectedSequence
        });

        if (!validation.success) {
            toast.error(validation.error.issues[0].message);
            return;
        }

        setIsSubmitting(true);
        const contactCount = contactLists.find(c => c.name === selectedContactList)?.count || 0;
        
        const newCampaignData = {
            name: newCampaignName,
            status: 'Active' as const,
            contacts: contactCount,
            sent: 0,
            open_rate: 0,
            reply_rate: 0,
        };
        
        const { data: newCampaign, error } = await supabase
            .from('campaigns')
            .insert(newCampaignData)
            .select()
            .single();

        if (error) {
            console.error('Error creating campaign:', error);
            toast.error('Failed to create campaign.');
        } else if (newCampaign) {
            toast.success('Campaign created successfully!');
            onCampaignCreated(newCampaign);
            onClose();
            setNewCampaignName('');
        }
        setIsSubmitting(false);
    };

    return (
        <Transition appear show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/30" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child as={React.Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">Create New Campaign</Dialog.Title>
                            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                <div>
                                    <label htmlFor="campaignName" className="block text-sm font-medium text-slate-600 mb-1">Campaign Name</label>
                                    <input type="text" id="campaignName" value={newCampaignName} onChange={(e) => setNewCampaignName(e.target.value)}
                                        className="w-full bg-slate-50 border-slate-300 rounded-md shadow-sm p-2 text-slate-900 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="e.g., Q1 SaaS Outreach" />
                                </div>
                                <div>
                                    <label htmlFor="contactList" className="block text-sm font-medium text-slate-600 mb-1">Contact List</label>
                                    <select id="contactList" value={selectedContactList} onChange={(e) => setSelectedContactList(e.target.value)}
                                        className="w-full bg-slate-50 border-slate-300 rounded-md shadow-sm p-2 text-slate-900 focus:ring-teal-500 focus:border-teal-500">
                                       {contactLists.map(list => <option key={list.name}>{`${list.name} (${list.count} contacts)`}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="sequence" className="block text-sm font-medium text-slate-600 mb-1">Sequence</label>
                                    <select id="sequence" value={selectedSequence} onChange={(e) => setSelectedSequence(e.target.value)}
                                        className="w-full bg-slate-50 border-slate-300 rounded-md shadow-sm p-2 text-slate-900 focus:ring-teal-500 focus:border-teal-500">
                                        {sequences.map(seq => <option key={seq.id} value={seq.id}>{seq.name}</option>)}
                                    </select>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button type="button" onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-md transition-colors">Cancel</button>
                                    <button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-teal-400 disabled:cursor-wait">
                                        {isSubmitting ? 'Creating...' : 'Create Campaign'}
                                    </button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};