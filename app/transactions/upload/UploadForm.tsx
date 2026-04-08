'use client';

import { useState, useEffect } from 'react';
import { deleteTemplate } from '@/lib/actions/mappings';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';

type AmountMode = 'single' | 'split';
type UploadResult = { imported: number; skipped: number; failed: number };

export default function UploadForm({ accounts, templates: initialTemplates }: { accounts: any[], templates: any[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id.toString() || '');
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [templateName, setTemplateName] = useState<string>('');
  const [saveTemplate, setSaveTemplate] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [amountMode, setAmountMode] = useState<AmountMode>('single');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  // Persist form state to localStorage to survive page refresh
  useEffect(() => {
    const saved = localStorage.getItem('uploadFormState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setAccountId(state.accountId || accounts[0]?.id.toString() || '');
        setMapping(state.mapping || {});
        setAmountMode(state.amountMode || 'single');
        setTemplateName(state.templateName || '');
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }, []);

  const saveFormState = () => {
    localStorage.setItem('uploadFormState', JSON.stringify({
      accountId,
      mapping,
      amountMode,
      templateName,
    }));
  };

  const clearFormState = () => {
    localStorage.removeItem('uploadFormState');
  };

  const accountTemplates = templates.filter(t => t.accountId.toString() === accountId);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id.toString() === selectedTemplateId);
      if (template) {
        const config = template.config as Record<string, number>;
        setMapping(config);
        setTemplateName(template.name);
        // Detect mode from saved config
        if (config.credit !== undefined || config.debit !== undefined) {
          setAmountMode('split');
        } else {
          setAmountMode('single');
        }
        saveFormState();
      }
    }
  }, [selectedTemplateId, templates]);

  const handleDeleteTemplate = async (templateId: number) => {
    await deleteTemplate(templateId);
    setTemplates(templates.filter(t => t.id !== templateId));
    setSelectedTemplateId('');
    clearFormState();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
        setCsvData(rows.filter(row => row.length > 1));
      };
      reader.readAsText(selectedFile);
    }
  };

  const singleFields = [
    { name: 'date', label: 'Date', required: true },
    { name: 'description', label: 'Description', required: true },
    { name: 'amount', label: 'Amount', required: true },
    { name: 'isCredit', label: 'Is Credit (Optional)', required: false },
    { name: 'category', label: 'Category (Optional)', required: false },
  ];

  const splitFields = [
    { name: 'date', label: 'Date', required: true },
    { name: 'description', label: 'Description', required: true },
    { name: 'credit', label: 'Credit Amount (Optional)', required: false },
    { name: 'debit', label: 'Debit Amount (Optional)', required: false },
    { name: 'category', label: 'Category (Optional)', required: false },
  ];

  const activeFields = amountMode === 'single' ? singleFields : splitFields;

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !accountId || !csvData) return;

    setUploading(true);
    setResult(null);
    try {
      const response = await fetch('/api/transactions/upload', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          csvData,
          mapping,
          templateName,
          saveTemplate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult({ imported: data.imported, skipped: data.skipped, failed: data.failed });
        clearFormState();
      } else {
        alert('Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Account</label>
          <select
            className="form-select"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setSelectedTemplateId('');
            }}
            required
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {accountTemplates.length > 0 && (
          <div className="form-group">
            <label className="form-label">Load Saved Template (Optional)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <select
                className="form-select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">-- Select Template --</option>
                {accountTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedTemplateId && (
                <ConfirmDeleteButton
                  className="btn btn-danger"
                  style={{ marginTop: '0.25rem' }}
                  onClick={() => {
                    const template = accountTemplates.find(t => t.id.toString() === selectedTemplateId);
                    if (template) handleDeleteTemplate(template.id);
                  }}
                />
              )}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">CSV File</label>
          <input
            type="file"
            accept=".csv"
            className="form-input"
            onChange={handleFileChange}
            required
          />
        </div>

        {csvData && (
          <div className="mt-4">
            <h3 className="mb-2">Map CSV Columns</h3>

            <div className="form-group">
              <label className="form-label">Amount Format</label>
              <div className="flex gap-4">
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="amountMode"
                    value="single"
                    checked={amountMode === 'single'}
                    onChange={() => {
                      setAmountMode('single');
                      const { credit, debit, ...rest } = mapping;
                      setMapping(rest);
                      saveFormState();
                    }}
                  />
                  Single amount column
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="amountMode"
                    value="split"
                    checked={amountMode === 'split'}
                    onChange={() => {
                      setAmountMode('split');
                      const { amount, isCredit, ...rest } = mapping;
                      setMapping(rest);
                      saveFormState();
                    }}
                  />
                  Separate credit &amp; debit columns
                </label>
              </div>
              {amountMode === 'split' && (
                <p className="list-item-subtitle mt-1">
                  Credits will be stored as positive, debits as negative.
                </p>
              )}
            </div>

            <p className="list-item-subtitle mb-4">Select which CSV column corresponds to each field.</p>

            {activeFields.map(field => (
              <div key={field.name} className="form-group">
                <label className="form-label">{field.label}</label>
                <select
                  className="form-select"
                  value={mapping[field.name] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      const { [field.name]: _, ...rest } = mapping;
                      setMapping(rest);
                    } else {
                      setMapping({ ...mapping, [field.name]: parseInt(val) });
                    }
                    saveFormState();
                  }}
                  required={field.required}
                >
                  <option value="">Select Column</option>
                  {csvData[0].map((col, idx) => (
                    <option key={idx} value={idx}>{col || `Column ${idx + 1}`}</option>
                  ))}
                </select>
                {mapping[field.name] !== undefined && csvData[1] && (
                  <p className="list-item-subtitle mt-1">
                    Sample: <strong>{csvData[1][mapping[field.name]] || '(empty)'}</strong>
                  </p>
                )}
              </div>
            ))}

            <div className="card mb-4 mt-4" style={{ backgroundColor: 'var(--bg)' }}>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={saveTemplate}
                    onChange={(e) => setSaveTemplate(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Save as template</span>
                </label>
              </div>

              {saveTemplate && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Template Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Chase Statement"
                    required={saveTemplate}
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <h4 className="mb-2">Input Preview</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      {csvData[0].map((col, idx) => (
                        <th key={idx}>{col || `Column ${idx + 1}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1, 4).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="mb-2">Output Preview</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      {amountMode === 'single' ? (
                        <>
                          <th>Amount</th>
                          <th>Is Credit</th>
                        </>
                      ) : (
                        <>
                          <th>Credit</th>
                          <th>Debit</th>
                        </>
                      )}
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1, 4).map((row, i) => (
                      <tr key={i}>
                        <td>{mapping.date !== undefined ? row[mapping.date] : <span className="list-item-subtitle">(unmapped)</span>}</td>
                        <td>{mapping.description !== undefined ? row[mapping.description] : <span className="list-item-subtitle">(unmapped)</span>}</td>
                        {amountMode === 'single' ? (
                          <>
                            <td>{mapping.amount !== undefined ? row[mapping.amount] : <span className="list-item-subtitle">(unmapped)</span>}</td>
                            <td>{mapping.isCredit !== undefined ? row[mapping.isCredit] : <span className="list-item-subtitle">(unmapped)</span>}</td>
                          </>
                        ) : (
                          <>
                            <td>{mapping.credit !== undefined ? row[mapping.credit] : <span className="list-item-subtitle">(unmapped)</span>}</td>
                            <td>{mapping.debit !== undefined ? row[mapping.debit] : <span className="list-item-subtitle">(unmapped)</span>}</td>
                          </>
                        )}
                        <td>{mapping.category !== undefined ? row[mapping.category] : <span className="list-item-subtitle">(unmapped)</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {result ? (
              <div className="card mt-4" style={{ backgroundColor: 'var(--bg)' }}>
                <div className="flex gap-4" style={{ flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{result.imported}</div>
                    <div className="list-item-subtitle">Imported</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{result.skipped}</div>
                    <div className="list-item-subtitle">Skipped (duplicates)</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.failed > 0 ? '#ef4444' : 'var(--text-muted)' }}>{result.failed}</div>
                    <div className="list-item-subtitle">Failed (invalid rows)</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href="/transactions" className="btn btn-primary w-full" style={{ textAlign: 'center' }}>
                    View Transactions
                  </a>
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    onClick={() => {
                      setResult(null);
                      setFile(null);
                      setCsvData(null);
                    }}
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            ) : (
              <button type="submit" className="btn btn-primary mt-4 w-full" disabled={uploading}>
                {uploading ? 'Uploading…' : 'Finish Upload'}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
