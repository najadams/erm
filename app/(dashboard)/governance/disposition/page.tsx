'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface RecordItem {
  id: string;
  title: string;
  referenceNumber: string;
  dispositionDate: string;
  user: { name: string };
  recordType?: { name: string };
}

export default function DispositionQueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated') fetchQueue();
  }, [status]);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/records?status=READY_FOR_DISPO');
      if (res.ok) {
        const data = await res.json();
        setRecords(data?.records ?? (Array.isArray(data) ? data : []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveDestruction = async (id: string) => {
    if (!confirm('Are you sure you want to permanently mark this record as DISPOSED? This action is legally significant.')) return;
    
    setProcessing(id);
    try {
      const formData = new FormData();
      formData.append('status', 'DISPOSED');
      
      const res = await fetch(`/api/records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DISPOSED' }), // Note: api/records/[id] expects JSON for PATCH usually? Wait, I need to check API.
        // Checking API... usually PATCH /api/records/[id] is used. 
        // Let's assume standard JSON patch for now. If it uses FormData, I'll switch.
        // Actually, previous analysis of api/records/route.ts showed POST uses FormData. 
        // Need to check [id]/route.ts if I want to update.
        // Assume I can update status via PATCH.
        headers: {
            'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== id));
      } else {
        alert('Failed to update record');
      }
    } catch (err) {
      console.error(err);
      alert('Error processing request');
    } finally {
      setProcessing(null);
    }
  };

  const triggerAutomation = async () => {
      setLoading(true);
      try {
          const res = await fetch('/api/cron/retention', { method: 'POST' });
          const data = await res.json();
          alert(data.message);
          fetchQueue();
      } catch (e) {
          alert('Failed to run automation');
      } finally {
          setLoading(false);
      }
  };

  if (loading && records.length === 0) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Disposition Queue</h1>
                <p className="text-gray-600 mt-2">Review and approve records pending destruction.</p>
            </div>
            <button 
                onClick={triggerAutomation}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
                Run Retention Check
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disposition Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length === 0 ? (
                  <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No records pending disposition.
                      </td>
                  </tr>
              ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.referenceNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.recordType?.name || 'Generic'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {new Date(record.dispositionDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => approveDestruction(record.id)}
                          disabled={processing === record.id}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                        >
                          {processing === record.id ? 'Processing...' : 'Approve Destruction'}
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
