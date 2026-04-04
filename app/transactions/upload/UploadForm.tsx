'use client';

import { useState } from 'react';

export default function UploadForm({ accounts }: { accounts: any[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id.toString() || '');
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<Record<string, number>>({});

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

  const fields = [
    { name: 'date', label: 'Date' },
    { name: 'description', label: 'Description' },
    { name: 'amount', label: 'Amount' },
    { name: 'isCredit', label: 'Is Credit (Optional)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !accountId || !csvData) return;

    // Send mapping and data to server
    const response = await fetch('/api/transactions/upload', {
      method: 'POST',
      body: JSON.stringify({
        accountId,
        csvData,
        mapping,
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
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

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
            <p className="list-item-subtitle mb-4">Select which CSV column corresponds to each field. Header row: {csvData[0].join(', ')}</p>
            
            {fields.map(field => (
              <div key={field.name} className="form-group">
                <label className="form-label">{field.label}</label>
                <select 
                  className="form-select"
                  value={mapping[field.name] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [field.name]: parseInt(e.target.value) })}
                  required={field.name !== 'isCredit'}
                >
                  <option value="">Select Column</option>
                  {csvData[0].map((col, idx) => (
                    <option key={idx} value={idx}>{col || `Column ${idx + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}

            <div className="mt-4">
              <h4 className="mb-2">Preview (First 3 rows)</h4>
              <div className="list-container" style={{ fontSize: '0.75rem' }}>
                {csvData.slice(1, 4).map((row, i) => (
                  <div key={i} className="list-item">
                    {row.join(' | ')}
                  </div>
                ))}
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
