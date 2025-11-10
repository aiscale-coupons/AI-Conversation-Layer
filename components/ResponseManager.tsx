import * as React from 'react';
import { Reply, IntentType } from '../types';
import { detectReplyIntent } from '../services/geminiService';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import Spinner from './Spinner';

const WandSparklesIcon = ({className}: {className?: string}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9.5 2.5 1.8 3.6 3.6 1.8-3.6 1.8-1.8 3.6-1.8-3.6-3.6-1.8 3.6-1.8Z"></path><path d="M20 10.5 18.2 6.9 14.5 5l3.7-1.9L20 .5l1.8 3.6 3.7 1.9-3.7 1.9Z"></path><path d="m14.5 19.5 1.8-3.6 3.7-1.9-3.7-1.9-1.8-3.6-1.8 3.6-3.7 1.9 3.7 1.9Z"></path>
    </svg>
);

const IntentBadge = ({ intent }: { intent: IntentType }) => {
    const intentStyles: Record<IntentType, string> = {
        [IntentType.POSITIVE]: 'bg-green-500/20 text-green-600',
        [IntentType.REFERRAL]: 'bg-blue-500/20 text-blue-600',
        [IntentType.OBJECTION]: 'bg-yellow-500/20 text-yellow-600',
        [IntentType.OPT_OUT]: 'bg-red-500/20 text-red-600',
        [IntentType.NEUTRAL]: 'bg-slate-500/20 text-slate-500',
        [IntentType.UNKNOWN]: 'bg-gray-500/20 text-gray-500',
    };

    return (
        <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${intentStyles[intent]}`}>
            {intent}
        </span>
    );
};


const ResponseManager = () => {
    const [replies, setReplies] = React.useState<Reply[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [loadingReplyId, setLoadingReplyId] = React.useState<number | null>(null);

    React.useEffect(() => {
        const fetchReplies = async () => {
            if (!supabase) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('replies')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("Error fetching replies:", error.message);
                toast.error("Could not fetch replies.");
            } else {
                setReplies(data || []);
            }
            setLoading(false);
        };
        fetchReplies();
    }, []);

    const handleDetectIntent = React.useCallback(async (reply: Reply) => {
        if (!supabase) return;
        setLoadingReplyId(reply.id);
        try {
            const detectedIntent = await detectReplyIntent(reply.body);
            
            const { error } = await supabase
                .from('replies')
                .update({ intent: detectedIntent })
                .eq('id', reply.id);

            if (error) {
                throw error;
            }

            setReplies(prevReplies =>
                prevReplies.map(r => r.id === reply.id ? { ...r, intent: detectedIntent } : r)
            );
            toast.success(`Intent detected as: ${detectedIntent}`);
        } catch (error) {
            console.error("Failed to detect and update intent", error);
            toast.error("An error occurred while detecting intent.");
        } finally {
            setLoadingReplyId(null);
        }
    }, []);

    const handleDetectAll = async () => {
        const repliesToAnalyze = replies.filter(r => !r.intent);
        if (repliesToAnalyze.length === 0) {
            toast.success("All replies have already been analyzed.");
            return;
        }

        const toastId = toast.loading(`Analyzing ${repliesToAnalyze.length} replies...`);
        for (const reply of repliesToAnalyze) {
            await handleDetectIntent(reply);
        }
        toast.success("All unclassified replies have been analyzed.", { id: toastId });
    };


    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Response Manager</h2>
                    <p className="text-slate-500 mt-1">AI-powered analysis of incoming email replies.</p>
                </div>
                <button 
                    onClick={handleDetectAll}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md inline-flex items-center gap-2 transition-colors">
                    <WandSparklesIcon className="w-5 h-5" />
                    Analyze All
                </button>
            </header>

            <div className="space-y-6">
                {loading ? (
                    <div className="flex justify-center items-center p-8 bg-white rounded-lg border border-slate-200/80">
                        <Spinner />
                    </div>
                ) : replies.length === 0 ? (
                    <p className="text-center text-slate-500 p-8 bg-white rounded-lg border border-slate-200/80">No replies found.</p>
                ) : replies.map(reply => (
                    <div key={reply.id} className="bg-white rounded-lg border border-slate-200/80 p-6">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                            <div>
                                <p className="font-semibold text-slate-900">{reply.from}</p>
                                <p className="text-sm text-slate-500">{reply.subject}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {reply.intent ? (
                                    <IntentBadge intent={reply.intent} />
                                ) : (
                                    <button
                                        onClick={() => handleDetectIntent(reply)}
                                        disabled={loadingReplyId === reply.id}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1.5 px-3 rounded-md text-sm disabled:opacity-50 disabled:cursor-wait transition-colors"
                                    >
                                        {loadingReplyId === reply.id ? 'Analyzing...' : 'Detect Intent'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div 
                            className="text-slate-600 whitespace-pre-wrap text-sm border-l-2 border-slate-200 pl-4 py-2 bg-slate-50 rounded-r-md"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.body) }}
                        />
                        {reply.intent === IntentType.POSITIVE && (
                            <p className="text-xs text-green-600 mt-3 text-right">
                                Sequence stopped. Reply forwarded to sales@aiscale.pro
                            </p>
                        )}
                        {reply.intent && reply.intent !== IntentType.POSITIVE && (
                            <p className="text-xs text-yellow-600 mt-3 text-right">
                                Sequence stopped for this lead.
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResponseManager;