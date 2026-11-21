import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileUp,
  Trash2,
  X,
} from 'lucide-react';
import {
  deleteFinancialDocument,
  downloadFinancialDocument,
  resolveDocumentContentType,
  uploadFinancialDocument,
  viewFinancialDocument,
  type UploadController,
  type UploadProgressInfo,
} from '../lib/firestoreService';
import type { DocumentCategory, UploadedDocument } from '../types/creditpulse';

interface DocumentVaultViewProps {
  uid: string;
  documents: UploadedDocument[];
}

const CATEGORIES: DocumentCategory[] = [
  'Income Proof',
  'Bank Statement',
  'Credit Report',
  'Loan Offer',
  'Other',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(ts?: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return 'Just now';
  return ts.toDate().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMimeLabel(mime: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'image/jpeg') return 'JPG';
  if (mime === 'image/png') return 'PNG';
  if (mime === 'text/csv' || mime === 'application/vnd.ms-excel') return 'CSV';
  return mime || 'File';
}

export function DocumentVaultView({ uid, documents }: DocumentVaultViewProps) {
  const [category, setCategory] = useState<DocumentCategory>('Income Proof');
  const [uploading, setUploading] = useState(false);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo>({
    percent: 0,
    bytesTransferred: 0,
    totalBytes: 0,
  });
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cancelRef = useRef<UploadController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const readyDocuments = documents.filter((d) => d.uploadStatus !== 'uploading');

  async function startUpload(file: File) {
    if (uploading) return;
    if (file.size <= 0) {
      setError('The selected file is empty (0 bytes).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Maximum file size is 10 MB.');
      return;
    }
    if (!resolveDocumentContentType(file)) {
      setError('Unsupported file type. Upload a PDF, JPG, PNG, or CSV document.');
      return;
    }

    setUploading(true);
    setActiveFileName(file.name);
    setProgressInfo({ percent: 0, bytesTransferred: 0, totalBytes: file.size });
    setError(null);
    setNotice(null);

    try {
      const result = await uploadFinancialDocument(
        uid,
        file,
        category,
        (info) => setProgressInfo(info),
        (ctrl) => {
          cancelRef.current = ctrl;
        }
      );
      setNotice(
        result.backend === 'firebase-storage'
          ? `Uploaded "${file.name}" to Firebase Cloud Storage and saved metadata in Firestore.`
          : `Uploaded "${file.name}" securely to your Firestore Document Vault.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      cancelRef.current = null;
      setUploading(false);
      setActiveFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void startUpload(file);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void startUpload(file);
    }
  }

  function handleCancelUpload() {
    cancelRef.current?.cancel();
  }

  async function handleView(docItem: UploadedDocument) {
    setError(null);
    setBusyDocId(docItem.id);
    try {
      await viewFinancialDocument(uid, docItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open document.');
    } finally {
      setBusyDocId(null);
    }
  }

  async function handleDownload(docItem: UploadedDocument) {
    setError(null);
    setBusyDocId(docItem.id);
    try {
      await downloadFinancialDocument(uid, docItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download document.');
    } finally {
      setBusyDocId(null);
    }
  }

  async function handleDelete(docItem: UploadedDocument) {
    setError(null);
    setNotice(null);
    setDeletingId(docItem.id);
    try {
      await deleteFinancialDocument(uid, docItem);
      setNotice(`Deleted "${docItem.fileName}" from Document Vault.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete document.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          Document Vault
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Securely store salary slips, bank statements, and credit reports scoped to your verified Firebase UID.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`bg-white dark:bg-slate-900 border rounded-xl p-6 space-y-4 transition-colors ${
          dragging
            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-full sm:w-56">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Document Category
            </label>
            <select
              value={category}
              disabled={uploading}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <label
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg whitespace-nowrap ${
              uploading
                ? 'bg-emerald-600/70 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>
              {uploading ? `Uploading ${progressInfo.percent}%` : 'Choose PDF / JPG / PNG / CSV'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.csv,application/pdf,image/jpeg,image/png,text/csv"
              disabled={uploading}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            Drag & drop or browse · PDF, JPG, PNG, CSV up to 10 MB
          </span>
        </div>

        {uploading && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                Uploading {activeFileName}
              </span>
              <div className="flex items-center gap-3 shrink-0 font-mono-tabular text-slate-600 dark:text-slate-400">
                <span>
                  {formatBytes(progressInfo.bytesTransferred)} / {formatBytes(progressInfo.totalBytes)} (
                  {progressInfo.percent}%)
                </span>
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-sans font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-150"
                style={{ width: `${progressInfo.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Uploaded Documents
          </h2>
          <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {readyDocuments.length} file(s)
          </span>
        </div>

        {readyDocuments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No documents uploaded yet. Upload your income proof, bank statements, or credit report above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-6">File Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Size</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {readyDocuments.map((d) => {
                  const isBusy = busyDocId === d.id || deletingId === d.id;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-6 font-semibold text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {d.fileName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {d.category}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatMimeLabel(d.contentType)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatBytes(d.sizeBytes)}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(d.createdAt)}
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleView(d)}
                          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50 mr-4"
                        >
                          <span>{busyDocId === d.id ? 'Opening...' : 'View'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDownload(d)}
                          className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:underline disabled:opacity-50 mr-4"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDelete(d)}
                          aria-label={`Delete ${d.fileName}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
