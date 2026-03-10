import React, { useState, useEffect } from 'react';
import { FolderOpen, Upload, FileText, Activity, RefreshCw } from 'lucide-react';
import createApiClient from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import Button from '../../components/button/Button';

export default function CommonDocs() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const axiosInstance = createApiClient();


  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('http://127.0.0.1:5010/api/admin/common_docs');
      setDocs(res.data.docs || []);
    } catch (err) {
      console.error('Error fetching common documents:', err);
      toast.error('Failed to load common documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
    }

    try {
      await axiosInstance.post('http://127.0.0.1:5010/api/admin/upload_common_doc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Documents uploaded and processed successfully!');
      fetchDocs();
    } catch (err) {
      console.error('Error uploading documents:', err);
      toast.error('Failed to upload documents.');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200/60 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2 flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <FolderOpen className="w-8 h-8 text-white drop-shadow-md" />
            </div>
            Common Documents
          </h1>
          <p className="text-slate-600">Upload general medical guidelines, prison policies, and other reference materials into the Vector Database.</p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchDocs} disabled={loading || uploading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <div className="relative">
            <input 
              type="file" 
              multiple 
              accept=".pdf" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              disabled={uploading}
              title="Upload PDF Documents"
            />
            <Button variant="primary" loading={uploading} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 p-8 border border-slate-200/60">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Vector Database Memory
        </h2>
        
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading documents...</div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="font-semibold text-slate-700">No Common Documents Found</p>
            <p className="text-sm">Upload context documents using the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-4 hover:border-indigo-300 transition-colors">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-semibold text-sm text-slate-800 truncate" title={doc.filename}>{doc.filename}</h4>
                  <p className="text-xs text-slate-500 mt-1">Processed in Vector DB</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
