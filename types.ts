// FIX: Removed self-imports of `ContactList` and `SequenceListItem` which were causing declaration conflicts.


export interface Campaign {
  id: number;
  created_at: string;
  name: string;
  status: 'Active' | 'Paused' | 'Completed';
  contacts: number;
  sent: number;
  open_rate: number;
  reply_rate: number;
}

export interface Contact {
  id: number;
  created_at?: string;
  firstName: string;
  companyName: string;
  industry: string;
  city: string;
  painPointSignal: string;
  email: string;
}

export interface Domain {
  id: number;
  created_at?: string;
  name: string;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
}

export interface Inbox {
  id: number;
  created_at?: string;
  email: string;
  domain: string;
  status: 'warming' | 'active' | 'error';
  dailyLimit: number;
}

export interface EmailStep {
  id: number;
  sequence_id?: number;
  delayDays: number;
  subjectA: string;
  subjectB?: string;
  body: string;
  useAbTest: boolean;
}

export interface Sequence {
  id: number;
  created_at?: string;
  name: string;
  steps: EmailStep[];
}

export interface SequenceListItem {
  id: number;
  name: string;
}

export interface ContactList {
  name: string;
  count: number;
}

export enum IntentType {
  POSITIVE = 'Positive',
  REFERRAL = 'Referral',
  OBJECTION = 'Objection',
  OPT_OUT = 'Opt-out',
  NEUTRAL = 'Neutral',
  UNKNOWN = 'Unknown',
}

export interface Reply {
    id: number;
    created_at?: string;
    from: string;
    subject: string;
    body: string;
    intent?: IntentType;
}