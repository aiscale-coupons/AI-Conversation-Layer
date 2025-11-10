import * as React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Domain } from '../types';
import toast from 'react-hot-toast';

const CopyIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
);


interface DomainRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: Domain | null;
}

const RecordRow = ({ type, host, value }: { type: string, host: string, value: string }) => {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-x-4 py-3 border-b border-slate-200 last:border-b-0">
            <div className="text-sm font-medium text-slate-500">{type}</div>
            <div className="font-mono text-xs text-slate-800 bg-slate-100 p-2 rounded-md break-all">{host}</div>
            <div className="flex items-center justify-between font-mono text-xs text-slate-800 bg-slate-100 p-2 rounded-md break-all">
                <span>{value}</span>
                <button onClick={() => copyToClipboard(value)} className="ml-2 p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md">
                    <CopyIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};


const DomainRecordsModal = ({ isOpen, onClose, domain }: DomainRecordsModalProps) => {
  if (!domain) return null;

  const records = {
    spf: {
      type: "TXT",
      host: "@",
      value: `v=spf1 include:_spf.google.com ~all`,
    },
    dkim: {
      type: "TXT",
      host: `google._domainkey`,
      value: `v=DKIM1; k=rsa; p=MIGfMA0...`,
    },
    dmarc: {
      type: "TXT",
      host: `_dmarc`,
      value: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain.name}`,
    },
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-20" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-slate-900">
                  DNS Records for {domain.name}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-slate-500">
                    Add the following records to your domain's DNS settings to ensure email deliverability.
                  </p>
                </div>

                <div className="mt-4">
                    <div className="hidden md:grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600 px-1 pb-2">
                        <span>Type</span>
                        <span>Host</span>
                        <span>Value</span>
                    </div>
                    <div className="space-y-2">
                        <RecordRow type={records.spf.type} host={records.spf.host} value={records.spf.value} />
                        <RecordRow type={records.dkim.type} host={records.dkim.host} value={records.dkim.value} />
                        <RecordRow type={records.dmarc.type} host={records.dmarc.host} value={records.dmarc.value} />
                    </div>
                </div>

                <div className="mt-4 bg-blue-50 text-blue-700 p-3 rounded-lg flex items-start gap-3 text-sm">
                    <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>DNS changes can take up to 48 hours to propagate. You can use the "Verify" button on the main dashboard to check the status.</p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                    onClick={onClose}
                  >
                    Done
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DomainRecordsModal;