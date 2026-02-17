'use client';

/**
 * Document List Component
 * Displays user's uploaded documents with actions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createAuthClient } from '@/lib/auth';

interface Document {
  id: string;
  filename: string;
  file_size: number;
  upload_date: string;
  status: string;
}

export function DocumentList({ workspaceId }: { workspaceId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const supabase = createAuthClient();
        const { data, error } = await supabase
          .from('documents')
          .select('id, filename, file_size, upload_date, status')
          .eq('workspace_id', workspaceId)
          .order('upload_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        setDocuments(data || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [workspaceId]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-8 text-center text-gray-400">Loading documents...</div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <p className="text-gray-400 mb-4">No documents uploaded yet</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Upload Your First Document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#16213e]/50 backdrop-blur-sm border border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left p-4 text-gray-400 font-medium">Filename</th>
              <th className="text-left p-4 text-gray-400 font-medium">Size</th>
              <th className="text-left p-4 text-gray-400 font-medium">Uploaded</th>
              <th className="text-left p-4 text-gray-400 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/20">
                <td className="p-4 text-white">{doc.filename}</td>
                <td className="p-4 text-gray-400">{formatFileSize(doc.file_size)}</td>
                <td className="p-4 text-gray-400">{formatDate(doc.upload_date)}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      doc.status === 'processed'
                        ? 'bg-green-500/20 text-green-400'
                        : doc.status === 'processing'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
