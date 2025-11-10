import * as React from 'react';
import { Contact, ContactList } from '../types';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import Spinner from './Spinner';

import { Session } from '@supabase/supabase-js';

const UploadIcon = ({ className }: {className?: string}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
);

interface ContactsViewProps {
    session: Session;
}

const AddToListModal = ({ isOpen, onClose, contact, lists, onAddToList }: { isOpen: boolean, onClose: () => void, contact: Contact | null, lists: ContactList[], onAddToList: (listId: number) => void }) => {
    const [selectedList, setSelectedList] = React.useState<number | null>(null);

    if (!isOpen || !contact) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedList) {
            onAddToList(selectedList);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Add {contact.firstName} to a list</h2>
                <form onSubmit={handleSubmit}>
                    <select
                        value={selectedList || ''}
                        onChange={(e) => setSelectedList(Number(e.target.value))}
                        className="w-full p-2 border rounded"
                        required
                    >
                        <option value="" disabled>Select a list</option>
                        {lists.map(list => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                    </select>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-slate-200 text-slate-800 hover:bg-slate-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded bg-teal-600 text-white hover:bg-teal-500">Add to List</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ContactsView = ({ session }: ContactsViewProps) => {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [file, setFile] = React.useState<File | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [contactLists, setContactLists] = React.useState<ContactList[]>([]);

  const fetchContacts = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching contacts:', error);
        toast.error('Could not fetch contacts.');
    } else if (data) {
        const formattedData = data.map((c: any) => ({
            id: c.id,
            firstName: c.first_name,
            companyName: c.company_name,
            industry: c.industry,
            city: c.city,
            painPointSignal: c.pain_point_signal,
            email: c.email
        }));
        setContacts(formattedData);
    }
    setLoading(false);
  };

  const fetchContactLists = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('contact_lists').select('id, name');
    if (error) {
        console.error('Error fetching contact lists:', error);
    } else {
        setContactLists(data || []);
    }
  };

  React.useEffect(() => {
    fetchContacts();
    fetchContactLists();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) {
        toast.error("Please select a file to import.");
        return;
    }
    if (!supabase || !session?.user) return;

    setIsImporting(true);
    const toastId = toast.loading(`Importing contacts from ${file.name}...`);

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const csvText = event.target?.result as string;
            if (!csvText) throw new Error("File is empty or could not be read.");

            const lines = csvText.trim().split(/\r\n|\n/);
            const headerLine = lines.shift();
            if (!headerLine) throw new Error("CSV header is missing.");
            
            const header = headerLine.trim().split(',').map(h => h.trim());
            
            const headerMap: { [key: string]: string } = {
                'firstName': 'first_name',
                'companyName': 'company_name',
                'industry': 'industry',
                'city': 'city',
                'painPointSignal': 'pain_point_signal',
                'email': 'email'
            };
            
            const expectedHeaders = Object.keys(headerMap);
            const isHeaderValid = expectedHeaders.every(h => header.includes(h));
            if (!isHeaderValid) {
                 throw new Error(`Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}`);
            }
            
            const contactsToInsert = lines.map(line => {
                const values = line.trim().split(',');
                const contactObject: { [key: string]: any } = {
                    user_id: session.user.id // FIX: Add user_id to satisfy RLS
                };
                header.forEach((colName, index) => {
                    const dbColumn = headerMap[colName];
                    if (dbColumn) {
                        contactObject[dbColumn] = values[index]?.trim() || '';
                    }
                });
                return contactObject;
            }).filter(c => c.email);

            if (contactsToInsert.length === 0) {
                throw new Error("No valid contacts with emails found in the file.");
            }

            const { error } = await supabase.from('contacts').upsert(contactsToInsert, { onConflict: 'email' });

            if (error) {
                console.error("Supabase insert error:", error);
                throw new Error(error.message);
            }

            toast.success(`${contactsToInsert.length} contacts imported successfully!`, { id: toastId });
            await fetchContacts();
            setFile(null);
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (e: any) {
            console.error("Import error:", e);
            toast.error(`Import failed: ${e.message}`, { id: toastId });
        } finally {
            setIsImporting(false);
        }
    };

    reader.onerror = () => {
         toast.error("Failed to read the file.", { id: toastId });
         setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const openAddToListModal = (contact: Contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleAddToContactList = async (listId: number) => {
    if (!supabase || !selectedContact) return;

    const { error } = await supabase.from('contact_list_members').insert({
        contact_id: selectedContact.id,
        contact_list_id: listId,
    });

    if (error) {
        toast.error(`Failed to add contact to list: ${error.message}`);
    } else {
        toast.success(`${selectedContact.firstName} added to list!`);
        setIsModalOpen(false);
        setSelectedContact(null);
    }
  };


  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Contacts</h2>
          <p className="text-slate-500 mt-1">Manage your contact lists for outreach campaigns.</p>
        </div>
        <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
                <label htmlFor="csv-upload" className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-md inline-flex items-center transition-colors">
                    <UploadIcon className="w-5 h-5 mr-2"/>
                    <span className="max-w-[120px] truncate">{file ? file.name : 'Choose CSV'}</span>
                </label>
                <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                <button
                    onClick={handleImport}
                    disabled={!file || isImporting}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isImporting ? 'Importing...' : 'Import Contacts'}
                </button>
            </div>
             <p className="text-xs text-slate-500 mt-2">
                Headers: firstName, companyName, industry, city, painPointSignal, email
             </p>
        </div>
      </header>

      <div className="bg-white rounded-lg border border-slate-200/80">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Company</th>
                    <th scope="col" className="px-6 py-3">Industry</th>
                    <th scope="col" className="px-6 py-3">Email</th>
                    <th scope="col" className="px-6 py-3">Pain Point Signal</th>
                    <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={6} className="p-8">
                                <div className="flex justify-center items-center">
                                    <Spinner />
                                </div>
                            </td>
                        </tr>
                    ) : (
                        contacts.map((contact) => (
                        <tr key={contact.id} className="bg-white border-b border-slate-200/80 hover:bg-slate-50">
                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{contact.firstName}</th>
                            <td className="px-6 py-4">{contact.companyName}</td>
                            <td className="px-6 py-4">{contact.industry}</td>
                            <td className="px-6 py-4">{contact.email}</td>
                            <td className="px-6 py-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contact.painPointSignal) }}></td>
                            <td className="px-6 py-4">
                                <button onClick={() => openAddToListModal(contact)} className="text-teal-600 hover:text-teal-800 font-semibold">Add to List</button>
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
      <AddToListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contact={selectedContact}
        lists={contactLists}
        onAddToList={handleAddToContactList}
      />
    </div>
  );
};

export default ContactsView;