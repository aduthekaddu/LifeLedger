'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FileViewerProps {
  recordId: number;
  title: string;
  onClose: () => void;
}

export default function FileViewer({ recordId, title, onClose }: FileViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileType, setFileType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFile();
  }, [recordId]);

  const loadFile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/records/${recordId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load file');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setFileUrl(url);
      setFileType(blob.type);
    } catch (err) {
      setError('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (fileUrl) {
      window.URL.revokeObjectURL(fileUrl);
    }
    onClose();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading file...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-red-600">{error}</div>
        </div>
      );
    }

    // Image files
    if (fileType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center p-4">
          <img src={fileUrl} alt={title} className="max-w-full max-h-[80vh] object-contain" />
        </div>
      );
    }

    // PDF files
    if (fileType === 'application/pdf') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-[80vh]"
          title={title}
        />
      );
    }

    // Text files
    if (fileType.startsWith('text/')) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-[80vh] bg-white"
          title={title}
        />
      );
    }

    // Unsupported file type
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-gray-600 mb-4">
          Preview not available for this file type
        </p>
        <a
          href={fileUrl}
          download
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          Download File
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
