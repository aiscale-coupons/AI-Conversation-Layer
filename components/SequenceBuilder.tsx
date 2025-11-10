import * as React from 'react';
import { EmailStep, Contact } from '../types';
import { generateEmailContent } from '../services/geminiService';
import { supabase } from '../supabase/client';
import type { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import Spinner from './Spinner';

const WandSparklesIcon = ({className}: {className?: string}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9.5 2.5 1.8 3.6 3.6 1.8-3.6 1.8-1.8 3.6-1.8-3.6-3.6-1.8 3.6-1.8Z"></path><path d="M20 10.5 18.2 6.9 14.5 5l3.7-1.9L20 .5l1.8 3.6 3.7 1.9-3.7 1.9Z"></path><path d="m14.5 19.5 1.8-3.6 3.7-1.9-3.7-1.9-1.8-3.6-1.8 3.6-3.7 1.9 3.7 1.9Z"></path>
    </svg>
);

const Trash2Icon = ({className}: {className?: string}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
);

interface SequenceBuilderProps {
    session: Session;
}

const SequenceBuilder = ({ session }: SequenceBuilderProps) => {
  const [sequenceName, setSequenceName] = React.useState('New Q4 Campaign');
  const [steps, setSteps] = React.useState<EmailStep[]>([
    { id: 1, delayDays: 0, subjectA: '', subjectB: '', body: 'Hi {{firstName}},\n\n', useAbTest: false },
  ]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = React.useState<number | null>(null);
  const [isGenerating, setIsGenerating] = React.useState<number | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadingContacts, setLoadingContacts] = React.useState(true);
  
  const mergeTags = ['{{firstName}}', '{{companyName}}', '{{industry}}', '{{city}}'];

  React.useEffect(() => {
    const fetchContacts = async () => {
        if (!supabase) return;
        setLoadingContacts(true);
        const { data, error } = await supabase.from('contacts').select('id, first_name, company_name, industry, city, pain_point_signal, email');
        if (error) {
            console.error("Error fetching contacts:", error);
            toast.error("Could not load contacts for AI context.");
        } else if (data) {
            const formattedData: Contact[] = data.map((c: any) => ({
                id: c.id,
                firstName: c.first_name,
                companyName: c.company_name,
                industry: c.industry,
                city: c.city,
                painPointSignal: c.pain_point_signal,
                email: c.email
            }));
            setContacts(formattedData);
            if (formattedData.length > 0) {
                setSelectedContactId(formattedData[0].id);
            }
        }
        setLoadingContacts(false);
    };
    fetchContacts();
  }, []);

  const handleStepChange = <K extends keyof EmailStep>(id: number, field: K, value: EmailStep[K]) => {
    setSteps(steps.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const addStep = () => {
    if (steps.length < 5) {
      const newStep: EmailStep = {
        id: Math.max(0, ...steps.map(s => s.id)) + 1,
        delayDays: 3,
        subjectA: 'Re: Previous Email',
        subjectB: '',
        body: 'Hi {{firstName}},\n\n',
        useAbTest: false,
      };
      setSteps([...steps, newStep]);
    }
  };

  const removeStep = (id: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter(step => step.id !== id));
    }
  };
  
  const handleGenerateAI = async (stepId: number) => {
      if (selectedContactId === null) {
          toast.error("Please select a sample contact to provide context for the AI.");
          return;
      }
      const selectedContact = contacts.find(c => c.id === selectedContactId);
      if (!selectedContact) {
          toast.error("Selected contact not found. Please refresh.");
          return;
      }

      setIsGenerating(stepId);
      const toastId = toast.loading('Generating AI content...');
      try {
          const content = await generateEmailContent(selectedContact);
          const currentStep = steps.find(s => s.id === stepId);
          if (currentStep) {
              const newBody = `Hi {{firstName}},\n\n${content.opener}\n\n...rest of the email...`;
              
              const updatedStep = {
                  ...currentStep,
                  subjectA: content.subjectA,
                  subjectB: currentStep.useAbTest ? content.subjectB : currentStep.subjectB,
                  body: newBody,
              };

              setSteps(steps.map(s => s.id === stepId ? updatedStep : s));
              toast.success('AI content generated!', { id: toastId });
          }
      } catch (error) {
          console.error('Failed to generate AI content', error);
          toast.error('Failed to generate AI content.', { id: toastId });
      } finally {
          setIsGenerating(null);
      }
  };

  const handleSaveSequence = async () => {
    if (!supabase) return;
    setIsSaving(true);
    const { data: sequenceData, error: sequenceError } = await supabase
        .from('sequences')
        .insert({ name: sequenceName })
        .select()
        .single();

    if (sequenceError || !sequenceData) {
        console.error("Error saving sequence:", sequenceError);
        toast.error("Failed to save sequence.");
        setIsSaving(false);
        return;
    }

    const stepsToInsert = steps.map((step, index) => ({
        sequence_id: sequenceData.id,
        step_number: index + 1,
        delay_days: step.delayDays,
        subject_a: step.subjectA,
        subject_b: step.subjectB,
        body: step.body,
        use_ab_test: step.useAbTest,
    }));

    const { error: stepsError } = await supabase
        .from('sequence_steps')
        .insert(stepsToInsert);

    if (stepsError) {
        console.error("Error saving sequence steps:", stepsError);
        toast.error("Failed to save sequence steps.");
    } else {
        toast.success("Sequence saved successfully!");
    }
    
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Sequence Builder</h2>
          <p className="text-slate-500 mt-1">Design your multi-step email campaigns.</p>
        </div>
        <button 
            onClick={handleSaveSequence}
            disabled={isSaving}
            className="bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-teal-400 disabled:cursor-wait"
        >
          {isSaving ? 'Saving...' : 'Save Sequence'}
        </button>
      </header>

      <div className="bg-white p-6 rounded-lg border border-slate-200/80 space-y-4">
        <div>
            <label htmlFor="sequenceName" className="block text-sm font-medium text-slate-600">Sequence Name</label>
            <input
            type="text"
            id="sequenceName"
            value={sequenceName}
            onChange={(e) => setSequenceName(e.target.value)}
            className="mt-1 block w-full bg-white border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-slate-900 p-2"
            />
        </div>
        <div className="flex items-center gap-3">
            <label htmlFor="sampleContact" className="text-sm font-medium text-slate-600 whitespace-nowrap">Sample Contact for AI:</label>
            <div className="relative w-full">
                <select 
                    id="sampleContact" 
                    value={selectedContactId || ''} 
                    onChange={(e) => setSelectedContactId(Number(e.target.value))}
                    disabled={loadingContacts || contacts.length === 0}
                    className="w-full bg-slate-50 border-slate-300 rounded-md shadow-sm p-2 text-slate-900 focus:ring-teal-500 focus:border-teal-500 text-sm disabled:opacity-70"
                >
                    {loadingContacts && <option>Loading contacts...</option>}
                    {!loadingContacts && contacts.length === 0 && <option>No contacts available</option>}
                    {contacts.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.firstName} ({c.companyName})
                        </option>
                    ))}
                </select>
                {loadingContacts && (
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <Spinner size="sm" />
                    </div>
                )}
            </div>
        </div>
      </div>

      {steps.map((step, index) => (
        <div key={step.id} className="bg-white rounded-lg border border-slate-200/80">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <span className="bg-teal-500 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">{index + 1}</span>
                    <h3 className="text-xl font-semibold text-slate-900">Step {index + 1}</h3>
                    {index > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Wait</span>
                            <input
                                type="number"
                                value={step.delayDays}
                                onChange={(e) => handleStepChange(step.id, 'delayDays', parseInt(e.target.value))}
                                className="w-16 bg-slate-100 border-slate-300 rounded-md text-center p-1"
                            />
                            <span className="text-slate-500">days</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                        onClick={() => handleGenerateAI(step.id)}
                        disabled={isGenerating === step.id || contacts.length === 0}
                        className="flex items-center gap-2 text-sm bg-teal-100 hover:bg-teal-200 text-teal-700 font-semibold py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                       <WandSparklesIcon className="w-4 h-4"/>
                       {isGenerating === step.id ? 'Generating...' : 'Generate with AI'}
                    </button>
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(step.id)} className="text-slate-500 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50">
                          <Trash2Icon className="w-5 h-5"/>
                      </button>
                    )}
                </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-slate-600">Subject</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id={`ab-toggle-${step.id}`}
                            checked={step.useAbTest}
                            onChange={(e) => handleStepChange(step.id, 'useAbTest', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 bg-white text-teal-500 focus:ring-teal-600 cursor-pointer"
                        />
                        <label htmlFor={`ab-toggle-${step.id}`} className="text-xs font-medium text-slate-500 cursor-pointer">
                            A/B Test Subject
                        </label>
                    </div>
                </div>
                <div className="space-y-2">
                    <input
                        type="text"
                        placeholder="Subject A"
                        value={step.subjectA}
                        onChange={(e) => handleStepChange(step.id, 'subjectA', e.target.value)}
                        className="w-full bg-white border-slate-300 rounded-md shadow-sm p-2 text-slate-900"
                    />
                    {step.useAbTest && (
                        <input
                            type="text"
                            placeholder="Subject B"
                            value={step.subjectB || ''}
                            onChange={(e) => handleStepChange(step.id, 'subjectB', e.target.value)}
                            className="w-full bg-white border-slate-300 rounded-md shadow-sm p-2 text-slate-900"
                        />
                    )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Body</label>
                <textarea
                    rows={8}
                    value={step.body}
                    onChange={(e) => handleStepChange(step.id, 'body', e.target.value)}
                    className="w-full bg-white border-slate-300 rounded-md shadow-sm p-2 text-slate-900 font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-500">Merge tags:</span>
                  {mergeTags.map(tag => (
                      <button key={tag} onClick={() => handleStepChange(step.id, 'body', step.body + ` ${tag} `)} className="bg-slate-200 hover:bg-slate-300 text-xs text-slate-700 px-2 py-1 rounded-md">{tag}</button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      {steps.length < 5 && (
          <button onClick={addStep} className="w-full border-2 border-dashed border-slate-300 hover:border-teal-500 hover:text-teal-500 text-slate-500 font-semibold py-3 px-4 rounded-md transition-colors">
              Add Step
          </button>
      )}
    </div>
  );
};

export default SequenceBuilder;