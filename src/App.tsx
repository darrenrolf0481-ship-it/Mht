import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { parseMHT } from './lib/mhtParser';
import { translateText, fetchOllamaModels, pullOllamaModel, ModelProvider, OllamaModel } from './lib/llm';
import { exportFiles, ExportFormat } from './lib/exporter';
import { Upload, Download, RefreshCw, Settings, FileText, Globe, CheckCircle2, AlertCircle, Clock, FileType, FilePlus } from 'lucide-react';

interface AppFile {
  id: string;
  name: string;
  originalHtml: string;
  translatedHtml: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export default function App() {
  const [files, setFiles] = useState<AppFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [globalError, setGlobalError] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('html');
  const [uploadProgress, setUploadProgress] = useState({ isUploading: false, current: 0, total: 0 });
  const [mobileTab, setMobileTab] = useState<'list' | 'preview'>('list');
  
  // Model settings
  const [provider, setProvider] = useState<ModelProvider>('google');
  const [modelName, setModelName] = useState<string>('gemini-3-flash-preview');
  const [apiKey, setApiKey] = useState<string>('');
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [pullModelName, setPullModelName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<{status: string, completed: number, total: number} | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (provider === 'ollama') {
      fetchOllamaModels().then(models => {
        setOllamaModels(models);
        if (models.length > 0 && (!modelName || modelName.includes('gemini') || modelName.includes('grok'))) {
          setModelName(models[0].name);
        }
      });
    } else if (provider === 'google') {
      setModelName('gemini-3-flash-preview');
    } else if (provider === 'grok') {
      setModelName('grok-2-latest');
    }
  }, [provider]);

  const handlePullModel = async () => {
    if (!pullModelName.trim()) return;
    setIsPulling(true);
    setPullStatus({ status: 'Starting pull...', completed: 0, total: 0 });
    setGlobalError('');
    
    try {
      await pullOllamaModel(pullModelName.trim(), (status, completed, total) => {
        setPullStatus({ 
          status, 
          completed: completed || 0, 
          total: total || 0 
        });
      });
      
      // Refresh models list
      const models = await fetchOllamaModels();
      setOllamaModels(models);
      setModelName(pullModelName.trim());
      setPullModelName('');
      setTimeout(() => setPullStatus(null), 3000);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to pull model');
      setPullStatus(null);
    } finally {
      setIsPulling(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;
    
    setGlobalError('');
    let totalFilesToProcess = selectedFiles.length;
    let currentProcessed = 0;
    setUploadProgress({ isUploading: true, current: 0, total: totalFilesToProcess });
    const newFiles: AppFile[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file);
          const zipEntries = Object.values(zip.files).filter(entry => 
            !entry.dir && (entry.name.toLowerCase().endsWith('.mht') || entry.name.toLowerCase().endsWith('.mhtml'))
          );
          
          totalFilesToProcess += zipEntries.length - 1;
          setUploadProgress(prev => ({ ...prev, total: totalFilesToProcess }));
          
          for (const entry of zipEntries) {
            currentProcessed++;
            setUploadProgress(prev => ({ ...prev, current: currentProcessed }));
            await new Promise(resolve => setTimeout(resolve, 10)); // Yield
            
            try {
              const text = await entry.async('string');
              const html = parseMHT(text);
              newFiles.push({
                id: Math.random().toString(36).substring(7),
                name: entry.name.split('/').pop() || entry.name,
                originalHtml: html,
                translatedHtml: '',
                status: 'pending'
              });
            } catch (err: any) {
              newFiles.push({
                id: Math.random().toString(36).substring(7),
                name: entry.name.split('/').pop() || entry.name,
                originalHtml: '',
                translatedHtml: '',
                status: 'error',
                error: err.message || 'Failed to parse MHT from ZIP'
              });
            }
          }
        } catch (err: any) {
          setGlobalError(prev => prev ? `${prev} | Failed to read ZIP ${file.name}` : `Failed to read ZIP ${file.name}`);
        }
      } else {
        currentProcessed++;
        setUploadProgress(prev => ({ ...prev, current: currentProcessed }));
        await new Promise(resolve => setTimeout(resolve, 10)); // Yield
        
        try {
          const text = await file.text();
          const html = parseMHT(text);
          newFiles.push({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            originalHtml: html,
            translatedHtml: '',
            status: 'pending'
          });
        } catch (err: any) {
          newFiles.push({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            originalHtml: '',
            translatedHtml: '',
            status: 'error',
            error: err.message || 'Failed to parse MHT'
          });
        }
      }
    }
    
    setFiles(prev => {
      const updated = [...prev, ...newFiles];
      if (!selectedFileId && updated.length > 0) {
        setSelectedFileId(updated[0].id);
      }
      return updated;
    });
    
    setUploadProgress({ isUploading: false, current: 0, total: 0 });
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTranslateAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (!pendingFiles.length) return;
    
    setIsProcessing(true);
    setGlobalError('');
    
    for (const file of pendingFiles) {
      if (!file.originalHtml) continue;
      
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processing', error: undefined } : f));
      
      try {
        const result = await translateText(file.originalHtml, provider, modelName, apiKey);
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'done', translatedHtml: result } : f));
      } catch (err: any) {
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error', error: err.message || 'Translation failed' } : f));
      }
    }
    
    setIsProcessing(false);
  };

  const handleDownload = async () => {
    const doneFiles = files.filter(f => f.status === 'done');
    if (!doneFiles.length) return;
    
    setIsExporting(true);
    setGlobalError('');
    
    try {
      const exportData = doneFiles.map(f => ({ name: f.name, html: f.translatedHtml, originalHtml: f.originalHtml }));
      const { blob, filename } = await exportFiles(exportData, exportFormat);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setGlobalError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAppendToJsonClick = async () => {
    const doneFiles = files.filter(f => f.status === 'done');
    if (!doneFiles.length) return;
    
    setGlobalError('');
    
    if ('showOpenFilePicker' in window) {
      try {
        setIsExporting(true);
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
          multiple: false
        });
        
        const file = await fileHandle.getFile();
        const text = await file.text();
        
        let existingData = [];
        if (text.trim()) {
          try {
            existingData = JSON.parse(text);
            if (!Array.isArray(existingData)) existingData = [existingData];
          } catch (e) {
            throw new Error("Selected file is not a valid JSON array.");
          }
        }
        
        const newData = doneFiles.map(f => ({ name: f.name, html: f.translatedHtml, originalHtml: f.originalHtml }));
        const mergedData = [...existingData, ...newData];
        
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(mergedData, null, 2));
        await writable.close();
        
        alert(`Successfully appended ${newData.length} files to ${file.name}`);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setGlobalError(err.message || 'Failed to append to JSON');
        }
      } finally {
        setIsExporting(false);
      }
    } else {
      // Fallback for browsers without File System Access API
      jsonInputRef.current?.click();
    }
  };

  const handleJsonAppendSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsExporting(true);
    setGlobalError('');
    
    try {
      const text = await file.text();
      let existingData = [];
      if (text.trim()) {
        try {
          existingData = JSON.parse(text);
          if (!Array.isArray(existingData)) {
            existingData = [existingData];
          }
        } catch (err) {
          throw new Error("Selected file is not valid JSON.");
        }
      }
      
      const doneFiles = files.filter(f => f.status === 'done');
      const newData = doneFiles.map(f => ({ name: f.name, html: f.translatedHtml, originalHtml: f.originalHtml }));
      
      const mergedData = [...existingData, ...newData];
      
      const blob = new Blob([JSON.stringify(mergedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to append to JSON');
    } finally {
      setIsExporting(false);
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      if (selectedFileId === id) {
        setSelectedFileId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const selectedFile = files.find(f => f.id === selectedFileId);
  const doneCount = files.filter(f => f.status === 'done').length;
  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'error').length;

  const MAX_PREVIEW_LENGTH = 50000;

  const renderPreview = (content: string, isEditable: boolean, onChange?: (val: string) => void, placeholder?: string, isProcessing?: boolean) => {
    if (isProcessing) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 text-gray-500 p-6">
          <RefreshCw className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p className="font-medium">Translating document...</p>
          <p className="text-xs mt-2 text-gray-400">This may take a moment for large files</p>
        </div>
      );
    }

    if (!content) {
      return (
        <textarea 
          value=""
          readOnly
          className="w-full flex-1 p-4 resize-none outline-none font-mono text-xs text-gray-400 bg-gray-50/50 min-h-0"
          placeholder={placeholder}
        />
      );
    }

    const isHuge = content.length > MAX_PREVIEW_LENGTH;
    const displayContent = isHuge 
      ? content.substring(0, MAX_PREVIEW_LENGTH) + '\n\n... [CONTENT TRUNCATED FOR PREVIEW PERFORMANCE] ...\n... [FULL CONTENT WILL BE EXPORTED] ...' 
      : content;

    return (
      <div className="flex-1 flex flex-col relative min-h-0">
        {isHuge && (
          <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 border-b border-amber-200 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>File is very large. Preview is truncated and editing is disabled to maintain performance.</span>
          </div>
        )}
        <textarea 
          value={displayContent}
          onChange={(e) => {
            if (!isHuge && onChange) onChange(e.target.value);
          }}
          readOnly={!isEditable || isHuge}
          className={`w-full flex-1 p-4 resize-none outline-none font-mono text-xs min-h-0 ${isEditable && !isHuge ? 'text-gray-800 bg-white' : 'text-gray-600 bg-gray-50/50'}`}
          placeholder={placeholder}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-200 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold tracking-tight">MHT Translator</h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full flex flex-col gap-6">
        {showSettings && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-2 shrink-0">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Model Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select 
                  value={provider} 
                  onChange={(e) => setProvider(e.target.value as ModelProvider)}
                  className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="google">Google Gemini</option>
                  <option value="grok">xAI Grok</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                {provider === 'ollama' ? (
                  <select 
                    value={modelName} 
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {ollamaModels.length === 0 && <option value="">Loading models...</option>}
                    {ollamaModels.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={modelName} 
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., gemini-3-flash-preview"
                  />
                )}
              </div>

              {(provider === 'grok' || provider === 'google') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key {provider === 'google' && <span className="text-gray-400 font-normal">(Optional if in env)</span>}
                  </label>
                  <input 
                    type="password" 
                    value={apiKey} 
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder={`Enter ${provider} API Key`}
                  />
                </div>
              )}
            </div>

            {provider === 'ollama' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Pull New Model</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pullModelName}
                    onChange={(e) => setPullModelName(e.target.value)}
                    placeholder="e.g., llama3, mistral, phi3"
                    className="flex-1 rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    disabled={isPulling}
                  />
                  <button
                    onClick={handlePullModel}
                    disabled={isPulling || !pullModelName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isPulling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Pull
                  </button>
                </div>
                {pullStatus && (
                  <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                    <span className="font-medium">{pullStatus.status}</span>
                    {pullStatus.total > 0 && (
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-200"
                          style={{ width: `${(pullStatus.completed / pullStatus.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {globalError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>{globalError}</div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* Left Column: File List */}
          <div className={`w-full lg:w-1/3 flex-col gap-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px] lg:min-h-0 ${mobileTab === 'list' ? 'flex' : 'hidden lg:flex'}`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
              <h2 className="font-medium flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Files ({files.length})
              </h2>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm bg-white border border-gray-300 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
              >
                <Upload className="w-4 h-4" />
                Add
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".mht,.mhtml,.zip" 
                multiple
                className="hidden" 
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {uploadProgress.isUploading && (
                <div className="p-4 mb-2 bg-blue-50 rounded-lg border border-blue-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm text-blue-700 font-medium">
                    <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Parsing files...</span>
                    <span>{uploadProgress.current} / {uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-200" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                  </div>
                </div>
              )}
              {files.length === 0 && !uploadProgress.isUploading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                  <Upload className="w-10 h-10 mb-3 text-gray-300" />
                  <p className="text-sm">Upload MHT or ZIP files to begin</p>
                </div>
              ) : (
                files.map(f => (
                  <div 
                    key={f.id}
                    onClick={() => {
                      setSelectedFileId(f.id);
                      setMobileTab('preview');
                    }}
                    className={`p-3 rounded-lg cursor-pointer flex items-center justify-between group transition-colors ${selectedFileId === f.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {f.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> :
                       f.status === 'processing' ? <RefreshCw className="w-5 h-5 text-blue-500 animate-spin shrink-0" /> :
                       f.status === 'error' ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> :
                       <Clock className="w-5 h-5 text-gray-400 shrink-0" />}
                      <div className="truncate text-sm font-medium text-gray-700">{f.name}</div>
                    </div>
                    <button 
                      onClick={(e) => removeFile(f.id, e)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      &times;
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3 shrink-0">
              <button 
                onClick={handleTranslateAll}
                disabled={pendingCount === 0 || isProcessing}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
              >
                {isProcessing ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><Globe className="w-4 h-4" /> Translate Pending ({pendingCount})</>
                )}
              </button>

              <div className="flex gap-2">
                <select 
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                  className="flex-1 rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="html">HTML</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word (DOC)</option>
                  <option value="json">JSON</option>
                </select>
                
                {exportFormat === 'json' ? (
                  <div className="flex flex-1 gap-2">
                    <button 
                      onClick={handleDownload}
                      disabled={doneCount === 0 || isExporting}
                      className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
                      title="Export as new JSON file"
                    >
                      {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      New
                    </button>
                    <button 
                      onClick={handleAppendToJsonClick}
                      disabled={doneCount === 0 || isExporting}
                      className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
                      title="Append to an existing JSON file"
                    >
                      <FilePlus className="w-4 h-4" />
                      Append
                    </button>
                    <input 
                      type="file" 
                      ref={jsonInputRef} 
                      onChange={handleJsonAppendSelect} 
                      accept=".json" 
                      className="hidden" 
                    />
                  </div>
                ) : (
                  <button 
                    onClick={handleDownload}
                    disabled={doneCount === 0 || isExporting}
                    className="flex-1 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm text-sm"
                  >
                    {isExporting ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Exporting...</>
                    ) : (
                      <><Download className="w-4 h-4" /> Export ({doneCount})</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className={`w-full lg:w-2/3 flex-col gap-4 ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'} h-full overflow-hidden`}>
            {selectedFile ? (
              <>
                <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm min-h-0">
                  <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2 shrink-0">
                    <FileType className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Original HTML Preview</span>
                  </div>
                  {renderPreview(selectedFile.originalHtml, false)}
                </div>
                <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col shadow-sm min-h-0">
                  <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2 shrink-0">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Translated HTML Preview</span>
                  </div>
                  {renderPreview(
                    selectedFile.translatedHtml, 
                    selectedFile.status === 'done', 
                    (val) => setFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, translatedHtml: val } : f)),
                    selectedFile.status === 'processing' ? 'Translating...' : 'Translated content will appear here...',
                    selectedFile.status === 'processing'
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 p-6 text-center shadow-sm">
                <FileText className="w-16 h-16 mb-4 text-gray-200" />
                <p>Select a file from the list to preview its content</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

