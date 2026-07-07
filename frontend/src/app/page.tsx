'use client';

import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowDownTrayIcon,
  BeakerIcon,
  BellAlertIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  KeyIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  adminSignals,
  auditEvents,
  consents,
  emergencyItems,
  fhirBundlePreview,
  labTrend,
  patient,
  timeline,
  type Role,
} from '@/lib/sampleData';

const roleConfig: Record<Role, { label: string; subtitle: string }> = {
  patient: {
    label: 'Patient wallet',
    subtitle: 'Control sharing, emergency data, exports, and visit prep.',
  },
  doctor: {
    label: 'Doctor workspace',
    subtitle: 'Review consented data with source citations and audit trails.',
  },
  admin: {
    label: 'Compliance console',
    subtitle: 'Provider verification, access reviews, AI review queue, and audit signals.',
  },
};

const filterOptions = ['all', 'documents', 'labs', 'medications', 'allergies'];

function toneForStatus(status: string) {
  if (status === 'Critical') return 'rose';
  if (status === 'Needs review') return 'amber';
  if (status === 'Active') return 'green';
  return 'blue';
}

function IconBadge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className="badge" data-tone={tone}>
      {children}
    </span>
  );
}

function Sidebar({
  role,
  onRoleChange,
}: {
  role: Role;
  onRoleChange: (role: Role) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <ShieldCheckIcon className="icon" />
        </div>
        <div>
          <h1>LifeLedger</h1>
          <p className="small-copy">FHIR-first health wallet</p>
        </div>
      </div>

      <div>
        <p className="eyebrow">Workspace</p>
        <div className="role-switcher" aria-label="Role switcher">
          {(Object.keys(roleConfig) as Role[]).map((item) => (
            <button
              key={item}
              className="role-button"
              data-active={role === item}
              onClick={() => onRoleChange(item)}
              type="button"
            >
              {item === 'patient' && <LockClosedIcon className="icon" />}
              {item === 'doctor' && <ClipboardDocumentCheckIcon className="icon" />}
              {item === 'admin' && <ShieldCheckIcon className="icon" />}
              <span>
                <strong>{roleConfig[item].label}</strong>
                <span className="small-copy">{roleConfig[item].subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="row">
        <h4>{patient.name}</h4>
        <p>{patient.bloodType} blood type · {patient.language}</p>
      </div>
    </aside>
  );
}

function Topbar({ role }: { role: Role }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Operational dashboard</p>
        <h2>{roleConfig[role].label}</h2>
      </div>
      <div className="actions">
        <button className="secondary-button" type="button" title="Search records">
          <MagnifyingGlassIcon className="icon" />
          Search
        </button>
        <button className="secondary-button" type="button" title="Export FHIR bundle">
          <ArrowDownTrayIcon className="icon" />
          FHIR export
        </button>
        <button className="primary-button" type="button" title="Create emergency packet">
          <QrCodeIcon className="icon" />
          Emergency card
        </button>
      </div>
    </header>
  );
}

function SummaryMetrics({ role }: { role: Role }) {
  const metrics =
    role === 'admin'
      ? adminSignals
      : [
          { label: 'Structured entries', value: 28, tone: 'green' },
          { label: 'Consented users', value: 2, tone: 'blue' },
          { label: 'Emergency scopes', value: 5, tone: 'amber' },
          { label: 'Audit events', value: 19, tone: 'rose' },
        ];

  return (
    <section className="summary-grid" aria-label="Key metrics">
      {metrics.map((metric) => (
        <div className="metric" key={metric.label}>
          <span className="badge" data-tone={metric.tone}>
            {metric.label}
          </span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </section>
  );
}

function TimelinePanel() {
  const [filter, setFilter] = useState('all');
  const visibleTimeline = useMemo(
    () => timeline.filter((item) => filter === 'all' || item.scope === filter),
    [filter],
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">FHIR-backed timeline</p>
          <h3>Longitudinal health record</h3>
        </div>
        <IconBadge tone="green">
          <DocumentTextIcon className="icon" />
          Private files
        </IconBadge>
      </div>
      <div className="panel-body">
        <div className="filters" aria-label="Timeline filters">
          {filterOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="filter-button"
              data-active={filter === option}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="timeline">
          {visibleTimeline.map((item) => (
            <article className="timeline-item" key={item.id}>
              <div>
                <strong>{item.date}</strong>
                <p>{item.type}</p>
              </div>
              <div>
                <h4>{item.title}</h4>
                <p>{item.detail}</p>
                <p className="meta">{item.source}</p>
              </div>
              <IconBadge tone={toneForStatus(item.status)}>{item.status}</IconBadge>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsentPanel({ role }: { role: Role }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Consent center</p>
          <h3>{role === 'doctor' ? 'Approved patient access' : 'Scoped sharing'}</h3>
        </div>
        <IconBadge tone="blue">
          <KeyIcon className="icon" />
          Expiring grants
        </IconBadge>
      </div>
      <div className="panel-body list">
        {consents.map((consent) => (
          <article className="row" key={consent.id}>
            <h4>{consent.grantee}</h4>
            <p>{consent.organization}</p>
            <p className="meta">{consent.purpose} · expires {consent.expires}</p>
            <div className="filters" style={{ marginTop: 10, marginBottom: 0 }}>
              {consent.scopes.map((scope) => (
                <span className="badge" key={scope}>
                  {scope}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmergencyPanel() {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Emergency card</p>
          <h3>QR packet with safe scopes</h3>
        </div>
        <IconBadge tone="amber">
          <BellAlertIcon className="icon" />
          24h token
        </IconBadge>
      </div>
      <div className="panel-body emergency-card">
        <div className="qr-frame" aria-label="Emergency QR preview">
          <QRCodeSVG value="https://lifeledger.local/emergency/demo-token" size={96} />
        </div>
        <div>
          <p className="small-copy">
            Shows allergies, active meds, emergency contacts, blood type, and directives only.
            Break-glass access creates an expiring audit event.
          </p>
          <div className="filters" style={{ marginTop: 12, marginBottom: 0 }}>
            {emergencyItems.map((item) => (
              <span className="badge" data-tone="amber" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LabPanel() {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Structured observations</p>
          <h3>Lab trend with context</h3>
        </div>
        <IconBadge tone="green">
          <BeakerIcon className="icon" />
          Cited values
        </IconBadge>
      </div>
      <div className="panel-body">
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={labTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="ldl" stroke="#b45309" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hdl" stroke="#0f766e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function AiPanel() {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI with governance</p>
          <h3>Visit prep, not diagnosis</h3>
        </div>
        <IconBadge tone="rose">
          <SparklesIcon className="icon" />
          Needs review
        </IconBadge>
      </div>
      <div className="panel-body list">
        <article className="row">
          <h4>What changed since the last appointment?</h4>
          <p>
            Recent LDL result improved from 148 to 132 mg/dL. Medication list still shows an
            active rescue inhaler. Penicillin allergy remains critical.
          </p>
        </article>
        <article className="row">
          <h4>Source citations</h4>
          <p>Lipid panel · Albuterol medication entry · Penicillin allergy entry</p>
        </article>
      </div>
    </section>
  );
}

function AuditPanel() {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Access ledger</p>
          <h3>Who accessed what and why</h3>
        </div>
        <IconBadge tone="blue">
          <ChartBarIcon className="icon" />
          Append-only events
        </IconBadge>
      </div>
      <div className="panel-body list">
        {auditEvents.map((event) => (
          <article className="row" key={event.id}>
            <h4>{event.action}</h4>
            <p>{event.actor} · {event.purpose}</p>
            <p className="meta">{event.time}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FhirPanel() {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Standards export</p>
          <h3>FHIR bundle preview</h3>
        </div>
        <IconBadge tone="green">R4-style resources</IconBadge>
      </div>
      <div className="panel-body">
        <code className="code-preview">
          {JSON.stringify(fhirBundlePreview, null, 2)}
        </code>
      </div>
    </section>
  );
}

function MobileRoleNav({
  role,
  onRoleChange,
}: {
  role: Role;
  onRoleChange: (role: Role) => void;
}) {
  return (
    <nav className="mobile-nav" aria-label="Mobile role switcher">
      {(Object.keys(roleConfig) as Role[]).map((item) => (
        <button
          className="filter-button"
          data-active={role === item}
          key={item}
          onClick={() => onRoleChange(item)}
          type="button"
        >
          {roleConfig[item].label}
        </button>
      ))}
    </nav>
  );
}

export default function Home() {
  const [role, setRole] = useState<Role>('patient');

  return (
    <div className="app-shell">
      <Sidebar role={role} onRoleChange={setRole} />
      <main className="main">
        <Topbar role={role} />
        <MobileRoleNav role={role} onRoleChange={setRole} />
        <SummaryMetrics role={role} />
        <div className="dashboard-grid">
          <div className="list">
            <TimelinePanel />
            <div className="two-column">
              <ConsentPanel role={role} />
              <EmergencyPanel />
            </div>
            <FhirPanel />
          </div>
          <div className="list">
            {role !== 'admin' && <LabPanel />}
            <AiPanel />
            <AuditPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
