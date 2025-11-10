import * as React from 'react';
import { supabase } from '../supabase/client';
import { ContactList } from '../types';
import toast from 'react-hot-toast';
import Spinner from './Spinner';

const ContactListsView = () => {
    const [lists, setLists] = React.useState<ContactList[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [newListName, setNewListName] = React.useState('');

    const fetchLists = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('contact_lists')
            .select('*, members:contact_list_members(count)');

        if (error) {
            console.error('Error fetching contact lists:', error);
            toast.error('Could not fetch contact lists.');
        } else if (data) {
            const formattedData = data.map((list: any) => ({
                id: list.id,
                name: list.name,
                count: list.members[0]?.count || 0,
            }));
            setLists(formattedData);
        }
        setLoading(false);
    };

    React.useEffect(() => {
        fetchLists();
    }, []);

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim() || !supabase) return;

        const toastId = toast.loading('Creating new list...');
        const { data, error } = await supabase
            .from('contact_lists')
            .insert({ name: newListName.trim() })
            .select('*, members:contact_list_members(count)')
            .single();

        if (error) {
            toast.error(`Failed to create list: ${error.message}`, { id: toastId });
        } else if (data) {
            const newList = {
                id: data.id,
                name: data.name,
                count: 0,
            };
            setLists([newList, ...lists]);
            setNewListName('');
            toast.success('List created successfully!', { id: toastId });
        }
    };

    const handleDeleteList = async (listId: number) => {
        if (!supabase) return;
        if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) return;

        const toastId = toast.loading('Deleting list...');
        const { error } = await supabase.from('contact_lists').delete().eq('id', listId);

        if (error) {
            toast.error(`Failed to delete list: ${error.message}`, { id: toastId });
        } else {
            setLists(lists.filter(list => list.id !== listId));
            toast.success('List deleted.', { id: toastId });
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-900">Contact Lists</h2>
                <p className="text-slate-500 mt-1">Group your contacts for targeted campaigns.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="bg-white rounded-lg border border-slate-200/80">
                        <div className="p-5">
                            <h3 className="text-lg font-semibold text-slate-900">All Lists</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">List Name</th>
                                        <th scope="col" className="px-6 py-3">Contacts</th>
                                        <th scope="col" className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-8 text-center"><Spinner /></td></tr>
                                    ) : lists.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-slate-500">No lists created yet.</td></tr>
                                    ) : (
                                        lists.map(list => (
                                            <tr key={list.id} className="bg-white border-b border-slate-200/80 hover:bg-slate-50">
                                                <td className="px-6 py-4 font-medium text-slate-900">{list.name}</td>
                                                <td className="px-6 py-4">{list.count}</td>
                                                <td className="px-6 py-4">
                                                    <button onClick={() => handleDeleteList(list.id)} className="text-red-500 hover:text-red-700 font-semibold">Delete</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="bg-white rounded-lg p-6 border border-slate-200/80">
                        <h3 className="text-lg font-semibold text-slate-900">Create New List</h3>
                        <form onSubmit={handleCreateList} className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="list-name" className="block text-sm font-medium text-slate-700">List Name</label>
                                <input
                                    type="text"
                                    id="list-name"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                    placeholder="e.g., 'Q4 Prospects'"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newListName.trim()}
                                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            >
                                Create List
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactListsView;
