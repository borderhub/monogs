'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Column {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

interface DbRecordEditFormProps {
  table: string;
  columns: Column[];
  record: Record<string, any>;
  recordId: string;
}

export default function DbRecordEditForm({
  table,
  columns,
  record,
  recordId,
}: DbRecordEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, any>>(record);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/db/${table}/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to update record');
      }

      router.push(`/admin/db/${table}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
      setIsSubmitting(false);
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {columns.map((col) => {
        const isDisabled = col.primaryKey;

        return (
          <div key={col.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {col.name}
              {col.primaryKey && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  Primary Key
                </span>
              )}
              <span className="ml-2 text-xs text-gray-500">({col.type})</span>
              {col.notNull && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </label>

            {col.type.toLowerCase() === 'text' && !isDisabled ? (
              <textarea
                value={formData[col.name] || ''}
                onChange={(e) => handleChange(col.name, e.target.value)}
                disabled={isDisabled}
                required={col.notNull && !col.primaryKey}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
                rows={5}
              />
            ) : (
              <input
                type="text"
                value={
                  formData[col.name] !== null &&
                  formData[col.name] !== undefined
                    ? formData[col.name]
                    : ''
                }
                onChange={(e) => handleChange(col.name, e.target.value)}
                disabled={isDisabled}
                required={col.notNull && !col.primaryKey}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            )}
          </div>
        );
      })}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
