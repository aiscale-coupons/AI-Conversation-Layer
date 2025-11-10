import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Assuming you are using react-router
import toast from 'react-hot-toast';

const InboxConnect = () => {
    const location = useLocation();
    const navigate = useNavigate();

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        const error = params.get('error');
        const success = params.get('success');
        const email = params.get('email');

        if (error) {
            toast.error(`Failed to connect inbox: ${error}`);
        }

        if (success) {
            toast.success(`Successfully connected inbox: ${email}`);
        }

        // Redirect back to the main dashboard or inboxes page after a short delay
        setTimeout(() => {
            navigate('/inboxes'); // Or your desired redirect path
        }, 3000);
    }, [location, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900">Connecting your inbox...</h2>
                <p className="text-slate-500 mt-2">Please wait while we securely connect your inbox. You will be redirected shortly.</p>
            </div>
        </div>
    );
};

export default InboxConnect;
