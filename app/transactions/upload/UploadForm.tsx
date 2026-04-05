'use client';

import { useState, useEffect } from 'react';

type AmountMode = 'single' | 'split';

export default function UploadForm({ accounts, templates }: { accounts: any[], templates: any[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id.toString() || '');
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [templateName, setTemplateName] = useState<string>('');
  const [saveTemplate, setSaveTemplate] = useState<boolean>(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [amountMode, setAmountMode] = useState<AmountMode>('single');

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
      }
    }
  }, [selectedTemplateId, templates]);

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
  ];

  const splitFields = [
    { name: 'date', label: 'Date', required: true },
    { name: 'description', label: 'Description', required: true },
    { name: 'credit', label: 'Credit Amount (Optional)', required: false },
    { name: 'debit', label: 'Debit Amount (Optional)', required: false },
  ];

  const activeFields = amountMode === 'single' ? singleFields : splitFields;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !accountId || !csvData) return;

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
      window.location.href = '/transactions';
    } else {
      alert('Upload failed');
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
            <select
              className="form-select"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">-- Select Template --</option>
              {accountTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
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
                  }}
                  required={field.required}
                >
                  <option value="">Select Column</option>
                  {csvData[0].map((col, idx) => (
                    <option key={idx} value={idx}>{col || `Column ${idx + 1}`}</option>
                  ))}
                </select>
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
              <h4 className="mb-2">Preview (First 3 rows)</h4>
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

            <button type="submit" className="btn btn-primary mt-4 w-full">
              Finish Upload
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
