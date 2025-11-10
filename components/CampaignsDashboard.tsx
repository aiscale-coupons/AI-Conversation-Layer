import * as React from 'react';
import { supabase } from '../supabase/client';
import { Campaign, SequenceListItem, ContactList } from '../types';
import type { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { CreateCampaignModal } from './CreateCampaignModal';
import Spinner from './Spinner';
import { startCampaign } from '../services/geminiService';

const Card = ({ title, value, isLoading }: { title: string; value: string; isLoading?: boolean; }) => (
  <div className="bg-white rounded-lg p-5 border border-slate-200/80">
    <h3 className="text-sm font-medium text-slate-500">{title}</h3>
    {isLoading ? (
      <div className="mt-2 h-9 w-24 bg-slate-200 rounded animate-pulse"></div>
    ) : (
      <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
    )}
  </div>
);

interface CampaignsDashboardProps {
    session: Session;
}

const CampaignsDashboard = ({ session }: CampaignsDashboardProps) => {
    const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
    const [stats, setStats] = React.useState({ emailsSent: 0, avgOpenRate: 0, avgReplyRate: 0, positiveReplies: 0 });
    const [loading, setLoading] = React.useState(true);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    
    const [sequences, setSequences] = React.useState<SequenceListItem[]>([]);
    const [contactLists, setContactLists] = React.useState<ContactList[]>([]);

    const fetchData = async () => {
        if (!supabase) return;
        setLoading(true);

        // Fetch campaign stats using the new RPC function
        const { data: campaignsData, error: campaignsError } = await supabase
            .rpc('get_campaign_stats');

        if (campaignsError) {
            console.error('Error fetching campaign stats:', campaignsError);
            toast.error("Could not fetch campaign stats.");
        } else if (campaignsData) {
            // Format the data to match the Campaign type, ensuring numeric types
            const formattedCampaigns = campaignsData.map(c => ({
                ...c,
                open_rate: parseFloat(c.open_rate || 0).toFixed(1),
                reply_rate: parseFloat(c.reply_rate || 0).toFixed(1),
            }));
            setCampaigns(formattedCampaigns);

            // Calculate overall stats from the fetched data
            const totalSent = formattedCampaigns.reduce((acc, c) => acc + c.sent, 0);
            const campaignsWithSends = formattedCampaigns.filter(c => c.sent > 0);
            const avgOpen = campaignsWithSends.length > 0 ? campaignsWithSends.reduce((acc, c) => acc + parseFloat(c.open_rate), 0) / campaignsWithSends.length : 0;
            const avgReply = campaignsWithSends.length > 0 ? campaignsWithSends.reduce((acc, c) => acc + parseFloat(c.reply_rate), 0) / campaignsWithSends.length : 0;
            
            const { count: positiveRepliesCount } = await supabase
                .from('replies')
                .select('*', { count: 'exact', head: true })
                .eq('intent', 'Positive');

            setStats({
                emailsSent: totalSent,
                avgOpenRate: parseFloat(avgOpen.toFixed(1)),
                avgReplyRate: parseFloat(avgReply.toFixed(1)),
                positiveReplies: positiveRepliesCount || 0,
            });
        }

        // Fetch sequences for the "Create Campaign" modal
        const { data: sequencesData, error: sequencesError } = await supabase.from('sequences').select('id, name');
        if (sequencesError) console.error(sequencesError);
        else setSequences(sequencesData || []);

        // Fetch contact lists with member counts
        const { data: listsData, error: listsError } = await supabase
            .from('contact_lists')
            .select('id, name, members:contact_list_members(count)');
        
        if (listsError) {
            console.error('Error fetching contact lists:', listsError);
        } else if (listsData) {
            const formattedLists = listsData.map((list: any) => ({
                id: list.id,
                name: list.name,
                count: list.members[0]?.count || 0,
            }));
            setContactLists(formattedLists);
        }
        
        setLoading(false);
    };


    React.useEffect(() => {
        fetchData();
    }, []);

    const addCampaignToList = (newCampaign: Campaign) => {
        setCampaigns([newCampaign, ...campaigns]);
    }

    const handleActivateCampaign = async (campaignId: number) => {
        toast.promise(
            startCampaign(campaignId),
            {
                loading: 'Activating campaign...',
                success: () => {
                    fetchData(); // Refresh data to show updated status
                    return 'Campaign activated successfully!';
                },
                error: (err) => `Failed to activate campaign: ${err.message}`,
            }
        );
    };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-900">Campaigns Dashboard</h2>
            <p className="text-slate-500 mt-1">Overview of your email outreach performance.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"
        >
            Create New Campaign
        </button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Emails Sent" value={stats.emailsSent.toLocaleString()} isLoading={loading} />
        <Card title="Avg. Open Rate" value={`${stats.avgOpenRate}%`} isLoading={loading} />
        <Card title="Avg. Reply Rate" value={`${stats.avgReplyRate}%`} isLoading={loading} />
        <Card title="Positive Replies" value={stats.positiveReplies.toLocaleString()} isLoading={loading} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200/80">
        <div className="p-5">
            <h3 className="text-lg font-semibold text-slate-900">Active Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                <th scope="col" className="px-6 py-3">Campaign Name</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Contacts</th>
                <th scope="col" className="px-6 py-3">Sent</th>
                <th scope="col" className="px-6 py-3">Open Rate</th>
                <th scope="col" className="px-6 py-3">Reply Rate</th>
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
                ) : campaigns.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-8 text-slate-500">No campaigns found. Create one to get started!</td></tr>
                ) : (
                    campaigns.map((campaign) => (
                    <tr key={campaign.id} className="bg-white border-b border-slate-200/80 hover:bg-slate-50">
                        <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{campaign.name}</th>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                campaign.status === 'active' ? 'bg-green-500/20 text-green-600' :
                                campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-600' :
                                campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-600' : 'bg-slate-500/20 text-slate-500'
                            }`}>
                                {campaign.status}
                            </span>
                            {campaign.status === 'draft' && (
                                <button
                                    onClick={() => handleActivateCampaign(campaign.id)}
                                    className="ml-2 px-3 py-1 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-500 transition-colors"
                                >
                                    Activate
                                </button>
                            )}
                        </td>
                        <td className="px-6 py-4">{campaign.contacts}</td>
                        <td className="px-6 py-4">{campaign.sent}</td>
                        <td className="px-6 py-4">{campaign.open_rate}%</td>
                        <td className="px-6 py-4">{campaign.reply_rate}%</td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
      </div>
      
      {isModalOpen && (
        <CreateCampaignModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            session={session}
            sequences={sequences}
            contactLists={contactLists}
            onCampaignCreated={addCampaignToList}
        />
      )}
    </div>
  );
};

export default CampaignsDashboard;