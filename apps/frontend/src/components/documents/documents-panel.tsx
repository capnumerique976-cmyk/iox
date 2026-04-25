'use client';

import { notifyError, notifySuccess } from '@/lib/notify';
import { useConfirm } from '@/components/ui/confirm-dialog';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, FileText, Download, Archive, AlertCircle, X, Plus, Eye } from 'lucide-react';
import { UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Document {
  id: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  notes?: string;
  expiresAt?: string;
  createdAt: string;
}

interface DocumentsPanelProps {
  /** EntityType enum value (PRODUCT_BATCH, INBOUND_BATCH, etc.) */
  linkedEntityType: string;
  linkedEntityId: string;
}

const CAN_UPLOAD = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function DocumentsPanel({ linkedEntityType, linkedEntityId }: DocumentsPanelProps) {
  const { user } = useAuth();
  const confirm = useConfirm();

  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Upload form */
  const [showUpload, setShowUpload] = useState(false);
  const [docName, setDocName] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = user && CAN_UPLOAD.includes(user.role);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams({
        linkedEntityType,
        linkedEntityId,
        status: 'ACTIVE',
        limit: '50',
      });
      const res = await fetch(`/api/v1/documents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des documents');
      const json = await res.json();
      setDocs(json.data?.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [linkedEntityType, linkedEntityId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docName.trim()) return;
    setUploading(true);
    setUploadError(null);
    try {
      const token = authStorage.getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', docName.trim());
      formData.append('linkedEntityType', linkedEntityType);
      formData.append('linkedEntityId', linkedEntityId);
      if (docNotes.trim()) formData.append('notes', docNotes.trim());
      if (docExpiry) formData.append('expiresAt', new Date(docExpiry).toISOString());

      const res = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      setShowUpload(false);
      setDocName('');
      setDocNotes('');
      setDocExpiry('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocs();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/documents/${doc.id}/url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Impossible d'obtenir le lien de téléchargement");
      const { data } = await res.json();
      window.open(data.url, '_blank');
    } catch (err) {
      notifyError(err, 'Action impossible, réessayez.');
    }
  };

  const handleArchive = async (docId: string) => {
    const ok = await confirm({
      title: 'Archiver ce document ?',
      description:
        "Le document ne sera plus visible dans la liste active. Il reste consultable dans l'historique d'audit.",
      confirmLabel: 'Archiver',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/documents/${docId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      notifySuccess('Document archivé');
      fetchDocs();
    } catch (err) {
      notifyError(err, 'Action impossible, réessayez.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Bouton upload */}
      {canUpload && !showUpload && (
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 w-full justify-center"
        >
          <Upload className="h-4 w-4" /> Ajouter un document
        </button>
      )}

      {/* Formulaire d'upload */}
      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="rounded-lg border border-blue-200 bg-blue-50 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-blue-900">Ajouter un document</h4>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du document *
              </label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Ex. Rapport analyse bactériologique"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fichier *</label>
              <div
                className="flex flex-col items-center justify-center w-full h-24 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 bg-white transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="text-center">
                    <FileText className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Plus className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Cliquer pour sélectionner</p>
                    <p className="text-xs text-gray-400">PDF, images, Word, Excel — max 10 Mo</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'expiration
              </label>
              <input
                type="date"
                value={docExpiry}
                onChange={(e) => setDocExpiry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="Observations…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !docName.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Upload en cours…' : 'Téléverser'}
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      {loading ? (
        <div className="text-center py-8 text-sm text-gray-500">Chargement…</div>
      ) : error ? (
        <div className="text-center py-8 text-sm text-red-500">{error}</div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
            <FileText className="h-8 w-8" />
            <p className="text-sm">Aucun document joint</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Taille</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ajouté le</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Expiration</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-400">{doc.originalFilename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                      {MIME_LABELS[doc.mimeType] ?? doc.mimeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatBytes(doc.sizeBytes)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {doc.expiresAt ? (
                      <span
                        className={
                          new Date(doc.expiresAt) < new Date() ? 'text-red-600 font-medium' : ''
                        }
                      >
                        {new Date(doc.expiresAt).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleDownload(doc)}
                        title="Télécharger"
                        className="rounded p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {canUpload && (
                        <button
                          onClick={() => handleArchive(doc.id)}
                          title="Archiver"
                          className="rounded p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
