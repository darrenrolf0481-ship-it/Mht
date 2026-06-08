import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import JSZip from 'jszip';
import { extractMHTBody, processSovereignPriority } from './lib/mhtParser';
import { translateText, fetchOllamaModels, pullOllamaModel, interactWithAI, ModelProvider, OllamaModel } from './lib/llm';
import { exportFiles, ExportFormat } from './lib/exporter';
import { Upload, Download, RefreshCw, Settings, FileText, Globe, CheckCircle2, AlertCircle, Clock, FileType, FilePlus, Tag, Trash2, Moon, Sun } from 'lucide-react';

interface AppFile {
  id: string;
  name: string;
  rawHtml: string;
  originalHtml: string;
  translatedHtml: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  context?: string;
  customTerms?: string;
}

export default function App() {
  const [files, setFiles] = useState<AppFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [globalError, setGlobalError] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('html');
  const [uploadProgress, setUploadProgress] = useState({ isUploading: false, current: 0, total: 0 });
  const [translationProgress, setTranslationProgress] = useState({ isActive: false, current: 0, total: 0 });
  const [mobileTab, setMobileTab] = useState<'list' | 'preview'>('list');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Model settings
  const [provider, setProvider] = useState<ModelProvider>('ollama');
  const [modelName, setModelName] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [globalContext, setGlobalContext] = useState<string>('');
  const [globalCustomTerms, setGlobalCustomTerms] = useState<string>('');
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [pullModelName, setPullModelName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullStatus, setPullStatus] = useState<{status: string, completed: number, total: number} | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [checkedFileIds, setCheckedFileIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (provider === 'ollama') {
      fetchOllamaModels().then(models => {
        setOllamaModels(models);
        if (models.length > 0 && (!modelName || modelName.includes('grok'))) {
          setModelName(models[0].name);
        }
      });
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

  const handleAiInteraction = async () => {
    if (!selectedFileId || !aiQuery.trim()) return;
    const selectedFile = files.find(f => f.id === selectedFileId);
    if (!selectedFile) return;

    setIsAiProcessing(true);
    setAiResult('');
    try {
      const result = await interactWithAI(
        selectedFile.translatedHtml || selectedFile.originalHtml,
        aiQuery,
        provider,
        modelName,
        apiKey
      );
      setAiResult(result);
    } catch (err: any) {
      setAiResult(`Error: ${err.message}`);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    if (!selectedFiles.length) return;
    
    setGlobalError('');
    let totalFilesToProcess = selectedFiles.length;
    let currentProcessed = 0;
    setUploadProgress({ isUploading: true, current: 0, total: totalFilesToProcess });
    const newFiles: AppFile[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      if (file.name.toLowerCase().endsWith('.json')) {
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          // Auto-configure from JSON context override
          if (parsed._meta === "Ollama Config Override" || parsed.system_instructions !== undefined || parsed.global_context || parsed.ai_context) {
            const contextText = parsed.system_instructions || parsed.global_context || parsed.ai_context || '';
            if (contextText) setGlobalContext(contextText);

            const termsText = parsed.custom_terms || parsed.global_custom_terms || parsed.customTerms || '';
            if (termsText) {
              setGlobalCustomTerms(termsText);
              // Trigger recalculation immediately since state is async
              newFiles.forEach((nf) => {
                 nf.originalHtml = processSovereignPriority(nf.rawHtml, [termsText, nf.customTerms].filter(Boolean).join(','));
              });
              setFiles(prev => prev.map(f => ({
                  ...f,
                  originalHtml: processSovereignPriority(f.rawHtml, [termsText, f.customTerms].filter(Boolean).join(','))
              })));
            }

            if (parsed.provider) setProvider(parsed.provider);
            if (parsed.model) setModelName(parsed.model);
            
            // Optionally blink settings or show a message?
            continue; // Do NOT add this JSON as a file to translate
          } else {
             // If it's a regular JSON file and not an override, treat it like an input payload
             newFiles.push({
               id: Math.random().toString(36).substring(7),
               name: file.name,
               rawHtml: text,
               originalHtml: text, // Leave JSON intact
               translatedHtml: '',
               status: 'pending',
               context: '',
               customTerms: ''
             });
          }
        } catch (e) {
             // standard json file failed to parse, or was raw unparseable, push safely
             const text = await file.text();
             newFiles.push({
               id: Math.random().toString(36).substring(7),
               name: file.name,
               rawHtml: text,
               originalHtml: text,
               translatedHtml: '',
               status: 'pending',
               context: '',
               customTerms: ''
             });
        }
      } else if (file.name.toLowerCase().endsWith('.zip')) {
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
              const body = extractMHTBody(text);
              const jsonOutput = processSovereignPriority(body, globalCustomTerms);
              newFiles.push({
                id: Math.random().toString(36).substring(7),
                name: entry.name.split('/').pop() || entry.name,
                rawHtml: body,
                originalHtml: jsonOutput,
                translatedHtml: '',
                status: 'pending',
                context: '',
                customTerms: ''
              });
            } catch (err: any) {
              newFiles.push({
                id: Math.random().toString(36).substring(7),
                name: entry.name.split('/').pop() || entry.name,
                rawHtml: '',
                originalHtml: '',
                translatedHtml: '',
                status: 'error',
                error: err.message || 'Failed to parse MHT from ZIP',
                context: '',
                customTerms: ''
              });
            }
          }
        } catch (err: any) {
          setGlobalError(prev => prev ? `${prev} | Failed to read ZIP ${file.name}` : `Failed to read ZIP ${file.name}`);
        }
      } else if (file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx')) {
        currentProcessed++;
        setUploadProgress(prev => ({ ...prev, current: currentProcessed }));
        newFiles.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          rawHtml: '',
          originalHtml: '',
          translatedHtml: '',
          status: 'error',
          error: 'Complex file types (PDF/DOCX) must be converted via the CLI tool first. Run: npx tsx scripts/convert.ts <file>',
          context: '',
          customTerms: ''
        });
      } else {
        currentProcessed++;
        setUploadProgress(prev => ({ ...prev, current: currentProcessed }));
        await new Promise(resolve => setTimeout(resolve, 10)); // Yield
        
        try {
          const text = await file.text();
          const body = file.name.toLowerCase().endsWith('.mht') || file.name.toLowerCase().endsWith('.mhtml') 
            ? extractMHTBody(text) 
            : text;
          const jsonOutput = processSovereignPriority(body, globalCustomTerms);
          newFiles.push({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            rawHtml: body,
            originalHtml: jsonOutput,
            translatedHtml: '',
            status: 'pending',
            context: '',
            customTerms: ''
          });
        } catch (err: any) {
          newFiles.push({
            id: Math.random().toString(36).substring(7),
            name: file.name,
            rawHtml: '',
            originalHtml: '',
            translatedHtml: '',
            status: 'error',
            error: err.message || 'Failed to process file',
            context: '',
            customTerms: ''
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
    setTranslationProgress({ isActive: true, current: 0, total: pendingFiles.length });
    
    let completed = 0;
    for (const file of pendingFiles) {
      if (!file.originalHtml) {
        completed++;
        setTranslationProgress(prev => ({ ...prev, current: completed }));
        continue;
      }
      
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processing', error: undefined } : f));
      
      try {
        const combinedContext = [globalContext, file.context].filter(Boolean).join('\n\n');
        const result = await translateText(file.originalHtml, provider, modelName, apiKey, combinedContext);
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'done', translatedHtml: result } : f));
      } catch (err: any) {
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error', error: err.message || 'Translation failed' } : f));
      }
      completed++;
      setTranslationProgress(prev => ({ ...prev, current: completed }));
    }
    
    setIsProcessing(false);
    setTranslationProgress({ isActive: false, current: 0, total: 0 });
  };

  const handleBulkTranslateSelected = async () => {
    const selectedFiles = files.filter(f => checkedFileIds.has(f.id));
    if (!selectedFiles.length) return;

    setIsProcessing(true);
    setGlobalError('');
    setTranslationProgress({ isActive: true, current: 0, total: selectedFiles.length });

    let completed = 0;
    for (const file of selectedFiles) {
      if (!file.originalHtml) {
        completed++;
        setTranslationProgress(prev => ({ ...prev, current: completed }));
        continue;
      }

      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'processing', error: undefined, translatedHtml: '' } : f));

      try {
        const combinedContext = [globalContext, file.context].filter(Boolean).join('\n\n');
        const result = await translateText(file.originalHtml, provider, modelName, apiKey, combinedContext);
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'done', translatedHtml: result } : f));
      } catch (err: any) {
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error', error: err.message || 'Translation failed' } : f));
      }
      completed++;
      setTranslationProgress(prev => ({ ...prev, current: completed }));
    }

    setIsProcessing(false);
    setTranslationProgress({ isActive: false, current: 0, total: 0 });
    setCheckedFileIds(new Set()); // Clear selection after processing
  };

  const handleBulkDeleteSelected = () => {
    setFiles(prev => {
      const remaining = prev.filter(f => !checkedFileIds.has(f.id));
      if (selectedFileId && checkedFileIds.has(selectedFileId)) {
        setSelectedFileId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
    setCheckedFileIds(new Set());
  };

  const toggleFileCheckbox = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setCheckedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleAllFileCheckboxes = () => {
    if (checkedFileIds.size === files.length && files.length > 0) {
      setCheckedFileIds(new Set());
    } else {
      setCheckedFileIds(new Set(files.map(f => f.id)));
    }
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

  const MAX_PREVIEW_LENGTH = 1500000;

  const renderPreview = (content: string, isEditable: boolean, onChange?: (val: string) => void, placeholder?: string, isProcessing?: boolean) => {
    if (isProcessing) {
      return (
        <div className={`flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden ${isDarkMode ? "bg-[#050505] text-red-900/60 font-tech uppercase tracking-widest" : "bg-gray-50/50 text-gray-500"}`}>
          {isDarkMode && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10 pointer-events-none"></div>}
          <RefreshCw className={`animate-spin mb-4 ${isDarkMode ? "w-10 h-10 text-neon-red drop-shadow-[0_0_10px_rgba(255,51,51,0.8)]" : "w-8 h-8 text-blue-500"}`} />
          <p className={`font-medium ${isDarkMode ? "text-neon-red drop-shadow-[0_0_5px_rgba(255,51,51,0.5)]" : ""}`}>{isDarkMode ? "Establishing Link..." : "Translating document..."}</p>
          <p className={`mt-2 ${isDarkMode ? "text-[10px] text-red-900/40 tracking-[0.3em]" : "text-xs text-gray-400"}`}>{isDarkMode ? "Stand by for data burst." : "This may take a moment for large files"}</p>
        </div>
      );
    }

    if (!content) {
      return (
        <textarea 
          value=""
          readOnly
          className={`w-full flex-1 p-4 resize-none outline-none font-mono text-xs min-h-0 ${isDarkMode ? "text-red-900/30 bg-[#0a0a0a] placeholder-red-900/20 shadow-[inset_0_0_20px_rgba(0,0,0,1)] selection:bg-red-900/50 cursor-not-allowed" : "text-gray-400 bg-gray-50/50"}`}
          placeholder={placeholder}
        />
      );
    }

    const isHuge = content.length > MAX_PREVIEW_LENGTH;
    const displayContent = isHuge 
      ? content.substring(0, MAX_PREVIEW_LENGTH) + '\n\n... [MEMORY FRAGMENT OVERFLOW. BUFFER TRUNCATED] ...\n... [FULL FEED WILL BE PRESERVED ON EXPORT] ...' 
      : content;

    return (
      <div className={`flex-1 flex flex-col relative min-h-0 ${isDarkMode ? "bg-[#0a0a0a]" : ""}`}>
        {isHuge && (
          <div className={`text-xs px-3 py-2 border-b flex items-center gap-2 shrink-0 ${isDarkMode ? "bg-[#1a0f05] text-neon-amber border-blood font-tech shadow-[inset_0_0_10px_rgba(255,153,0,0.1)]" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            <AlertCircle className={`w-4 h-4 shrink-0 ${isDarkMode ? "drop-shadow-[0_0_5px_rgba(255,153,0,0.8)]" : ""}`} />
            <span className={isDarkMode ? "uppercase tracking-wider" : ""}>{isDarkMode ? "Warning: Data Mass Exceeds Viewport Buffer. Editing Suspended." : "File is very large. Preview is truncated and editing is disabled to maintain performance."}</span>
          </div>
        )}
        <textarea 
          value={displayContent}
          onChange={(e) => {
            if (!isHuge && onChange) onChange(e.target.value);
          }}
          readOnly={!isEditable || isHuge}
          className={`w-full flex-1 p-4 resize-none outline-none font-mono min-h-0 transition-colors ${isDarkMode ? "text-sm leading-relaxed shadow-[inset_0_0_30px_rgba(0,0,0,1)] " + (isEditable && !isHuge ? "text-red-400 bg-[#050505] focus:ring-1 focus:ring-inset focus:ring-blood/50 selection:bg-blood/50" : "text-red-900/60 bg-[#0a0a0a] cursor-not-allowed selection:bg-red-900/20") : "text-xs " + (isEditable && !isHuge ? "text-gray-800 bg-white" : "text-gray-600 bg-gray-50/50")}`}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col relative ${isDarkMode ? "bg-[#050505] text-red-500 font-sans selection:bg-red-900/50 crt overflow-hidden" : "bg-gray-50 text-gray-900 font-sans selection:bg-blue-200"}`}>
      <header className={`sticky top-0 z-10 shrink-0 ${isDarkMode ? "bg-[#0a0a0a] border-b-2 border-blood shadow-[0_4px_30px_rgba(139,0,0,0.3)]" : "bg-white border-b border-gray-200 shadow-sm"}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className={`w-6 h-6 ${isDarkMode ? "text-neon-red animate-pulse" : "text-blue-600"}`} />
            <h1 className={`text-xl ${isDarkMode ? "font-tech text-neon-red drop-shadow-[0_0_8px_rgba(255,51,51,0.8)] uppercase tracking-[0.2em]" : "font-semibold tracking-tight"}`}>MHT Translator</h1>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 transition-colors flex items-center justify-center ${isDarkMode ? "rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20" : "rounded-full hover:bg-gray-100"}`}
            aria-label="Settings"
          >
            <Settings className={`w-5 h-5 ${isDarkMode ? "text-red-500 hover:text-neon-red" : "text-gray-600 hover:text-gray-900"}`} />
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 transition-colors flex items-center justify-center ${isDarkMode ? "rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20" : "rounded-full hover:bg-gray-100"}`}
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-red-500 hover:text-neon-red" /> : <Moon className="w-5 h-5 text-gray-600 hover:text-gray-900" />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full flex flex-col gap-6">
        {showSettings && (
          <div className={`p-4 animate-in fade-in slide-in-from-top-2 shrink-0 relative overflow-hidden ${isDarkMode ? "bg-[#111111] rounded-none shadow-[0_0_20px_rgba(139,0,0,0.15)] border border-blood/50" : "bg-white rounded-xl shadow-sm border border-gray-200"}`}>
            <div className={`absolute top-0 right-0 p-1 font-tech text-[10px] select-none ${isDarkMode ? "text-red-900/40" : "text-gray-300"}`}>SYS_CONFIG_OVERRIDE</div>
            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? "text-neon-red font-tech" : "text-gray-700 font-sans"}`}>Model Settings</h2>
              <button 
                onClick={() => setShowInstructions(!showInstructions)}
                className={`text-xs flex items-center gap-1.5 px-2.5 py-1 transition-colors ${isDarkMode ? "text-neon-red hover:text-white bg-[#1a0505] hover:bg-blood/80 rounded-none border border-blood/50 font-tech uppercase" : "text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md font-medium font-sans"}`}
              >
                <FileText className="w-3.5 h-3.5" />
                {showInstructions ? 'Hide Help' : 'Help & Instructions'}
              </button>
            </div>
            
            {showInstructions && (
              <div className={`mb-6 p-4 text-sm space-y-3 ${isDarkMode ? "bg-[#0a0a0a] border border-blood/40 rounded-none text-red-400 font-tech shadow-[inset_0_0_15px_rgba(255,51,51,0.05)]" : "bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-sans"}`}>
                <h3 className={`font-semibold pb-2 flex items-center gap-2 ${isDarkMode ? "text-neon-red border-b border-blood/50" : "text-gray-900 border-b border-gray-200"}`}><Settings className="w-4 h-4 animate-spin-slow"/> Quick Reference Guide</h3>
                <ul className={`space-y-2 list-disc list-inside ${isDarkMode ? "opacity-90" : ""}`}>
                  <li><strong>Uploading Files:</strong> Click "Add" or drop files. <strong>ZIP files</strong> containing .mht or .json are automatically unpacked and parsed.</li>
                  <li><strong>JSON Configurations:</strong> Drop a formatted `.json` file to instantly set up Global Context, Custom Terms, and Models without typing.</li>
                  <li><strong>Custom Terms:</strong> Commas block off specific root-level terms you want extracted globally or per-file (e.g. <i>"Project X, Target 4"</i>).</li>
                  <li><strong>Bulk Actions:</strong> Check the boxes next to files (or "Select All") to reveal Bulk Translate and Bulk Delete buttons.</li>
                  <li><strong>MD Code Export:</strong> Select "MD Code (.md)" when exporting to get perfectly formatted block-data you can feed directly to Ollamas.</li>
                  <li><strong>Sovereign System:</strong> This system inherently scans for priority telemetry, extracting biological metrics and identity nodes.</li>
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? "font-tech text-red-500 tracking-wide" : "font-medium text-gray-700"}`}>Provider</label>
                <select 
                  value={provider} 
                  onChange={(e) => setProvider(e.target.value as ModelProvider)}
                  className={`w-full border p-2 text-sm outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-red-400 focus:ring-1 focus:ring-neon-red shadow-[0_0_10px_rgba(255,51,51,0.2)]" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}`}
                >
                  <option value="grok">xAI Grok</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-tech text-red-500 tracking-wide mb-1">Model</label>
                {provider === 'ollama' ? (
                  <select 
                    value={modelName} 
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full rounded-none border-blood/40 bg-[#0a0a0a] text-red-400 border p-2 text-sm focus:ring-1 focus:ring-neon-red shadow-[0_0_10px_rgba(255,51,51,0.2)] outline-none"
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
                    className={`w-full border p-2 text-sm outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)]" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}`}
                  />
                )}
              </div>

              {provider === 'grok' && (
                <div>
                  <label className={`block text-sm mb-1 flex items-center justify-between ${isDarkMode ? "font-tech text-red-500 tracking-wide" : "font-medium text-gray-700"}`}>
                    API Key
                  </label>
                  <input 
                    type="password" 
                    value={apiKey} 
                    onChange={(e) => setApiKey(e.target.value)}
                    className={`w-full border p-2 text-sm outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"}`}
                    placeholder={`Enter ${provider} API Key`}
                  />
                </div>
              )}
            </div>

            {provider === 'ollama' && (
              <div className={`mt-4 pt-4 border-t ${isDarkMode ? "border-blood/50" : "border-gray-200"}`}>
                <h3 className="text-sm font-tech text-red-500 tracking-wide mb-2">Pull New Model</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pullModelName}
                    onChange={(e) => setPullModelName(e.target.value)}
                    placeholder="e.g., llama3, mistral, phi3"
                    className={`flex-1 border p-2 text-sm outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 placeholder-gray-400"}`}
                    disabled={isPulling}
                  />
                  <button
                    onClick={handlePullModel}
                    disabled={isPulling || !pullModelName.trim()}
                    className={`px-4 py-2 flex items-center gap-2 transition-all text-sm disabled:opacity-50 ${isDarkMode ? "bg-blood/80 border border-neon-red text-white uppercase font-tech tracking-wider hover:bg-neon-red hover:text-black disabled:bg-[#1a0505] disabled:border-blood/50 shadow-[0_0_10px_rgba(255,51,51,0.2)]" : "bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"}`}
                  >
                    {isPulling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Pull
                  </button>
                </div>
                {pullStatus && (
                  <div className={`mt-2 text-xs flex items-center gap-2 ${isDarkMode ? "font-tech text-red-400" : "text-gray-600"}`}>
                    <span className={`font-medium ${isDarkMode ? "tracking-wide uppercase" : ""}`}>{pullStatus.status}</span>
                    {pullStatus.total > 0 && (
                      <div className={`flex-1 h-1.5 overflow-hidden relative ${isDarkMode ? "bg-[#0a0a0a] border border-blood/30" : "bg-gray-200 rounded-full"}`}>
                        <div
                          className={`h-full transition-all duration-200 ${isDarkMode ? "bg-neon-red shadow-[0_0_8px_rgba(255,51,51,0.8)]" : "bg-blue-600"}`}
                          style={{ width: `${(pullStatus.completed / pullStatus.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className={`mt-4 pt-4 border-t space-y-4 ${isDarkMode ? "border-blood/50" : "border-gray-200"}`}>
               <div>
                  <label className={`block text-sm mb-1 flex items-center gap-1 ${isDarkMode ? "font-tech text-red-500 tracking-wide" : "font-medium text-gray-700"}`}>Global Translation Context</label>
                  <textarea 
                    value={globalContext}
                    onChange={(e) => setGlobalContext(e.target.value)}
                    placeholder="Instructions applied to all files (e.g. 'Use a formal tone', 'Translate into Spanish')"
                    className={`w-full border p-2 text-sm outline-none min-h-[60px] ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 placeholder-gray-400"}`}
                  />
               </div>
               <div>
                  <label className="block text-sm font-tech text-red-500 tracking-wide mb-1 flex items-center gap-1">Global Terms to Single Out</label>
                  <div className={`flex items-center gap-2 w-full border p-2 ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] focus-within:ring-1 focus-within:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)]" : "rounded-lg border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500"}`}>
                    <Tag className="w-4 h-4 text-red-900/60" />
                    <input 
                      type="text"
                      value={globalCustomTerms}
                      onChange={(e) => {
                        const newTerms = e.target.value;
                        setGlobalCustomTerms(newTerms);
                        setFiles(prev => prev.map(file => ({
                           ...file,
                           originalHtml: processSovereignPriority(file.rawHtml, [newTerms, file.customTerms].filter(Boolean).join(','))
                        })));
                      }}
                      placeholder="Comma separated terms to extract across ALL files..."
                      className={`w-full text-sm outline-none bg-transparent ${isDarkMode ? "font-tech text-neon-red placeholder-red-900/40" : "text-gray-900 placeholder-gray-400"}`}
                    />
                  </div>
               </div>
               <div className={`text-xs flex items-start gap-2 p-3 ${isDarkMode ? "font-tech text-red-400 bg-[#1a0505] border border-blood/50 shadow-[inset_0_0_10px_rgba(255,51,51,0.05)]" : "text-gray-500 bg-blue-50/50 rounded border border-blue-100"}`}>
                 <FileText className="w-4 h-4 text-neon-red shrink-0" />
                 <p className={`${isDarkMode ? "leading-relaxed" : ""}`}>Upload a JSON file containing <code className={`px-1 py-0.5 font-mono text-[10px] ${isDarkMode ? "bg-[#050505] border border-blood/30 text-neon-red" : "bg-white rounded text-blue-700"}`}>_meta: "Ollama Config Override"</code>, <code className="bg-[#050505] border border-blood/30 px-1 py-0.5 text-neon-red font-mono text-[10px]">system_instructions</code>, or <code className="bg-[#050505] border border-blood/30 px-1 py-0.5 text-neon-red font-mono text-[10px]">custom_terms</code> to instantly overwrite these rules globally without manually typing.</p>
               </div>
            </div>
          </div>
        )}

        {globalError && (
          <div className={`p-4 text-sm border flex items-start gap-2 shrink-0 ${isDarkMode ? "bg-[#1a0505] text-neon-red rounded-none border-red-900/50 animate-pulse font-tech shadow-[0_0_15px_rgba(255,51,51,0.2)]" : "bg-red-50 text-red-700 rounded-xl border-red-100"}`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>{globalError}</div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* Left Column: File List */}
          <div className={`w-full lg:w-1/3 flex-col overflow-hidden min-h-[300px] lg:min-h-0 relative ${mobileTab === "list" ? "flex" : "hidden lg:flex"} ${isDarkMode ? "gap-0 bg-[#0a0a0a] rounded-none border border-blood/50 shadow-[0_0_20px_rgba(139,0,0,0.15)]" : "gap-4 bg-white rounded-xl border border-gray-200 shadow-sm"}`}>
             {isDarkMode && <div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none z-10 pointer-events-none">SYS_FILE_NODES</div>}
            <div className={`p-4 border-b flex flex-col gap-3 shrink-0 ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <h2 className={`flex items-center gap-2 ${isDarkMode ? "font-tech text-neon-red uppercase tracking-wider" : "font-medium text-gray-900"}`}>
                  <FileText className={`w-5 h-5 ${isDarkMode ? "text-red-900/80" : "text-gray-500"}`} />
                  Files ({files.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 transition-all ${isDarkMode ? "bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:text-white hover:border-neon-red text-neon-red rounded-none font-tech uppercase" : "bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-gray-700"}`}
                  >
                    <Upload className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".mht,.mhtml,.zip,.json,.pdf,.docx" 
                  multiple
                  className="hidden" 
                />
              </div>
              
              {files.length > 0 && (
                <div className={`flex relative items-center gap-2 text-sm justify-between w-full pt-2 border-t ${isDarkMode ? "border-blood/30" : "border-gray-300"}`}>
                  <label className={`flex items-center gap-2 cursor-pointer transition-colors ${isDarkMode ? "text-red-500 font-tech uppercase hover:text-neon-red" : "text-gray-600 hover:text-gray-900"}`}>
                    <input 
                      type="checkbox" 
                      onChange={toggleAllFileCheckboxes}
                      checked={files.length > 0 && checkedFileIds.size === files.length}
                      className={`w-4 h-4 focus:ring-offset-0 ${isDarkMode ? "text-neon-red bg-[#050505] border-blood/50 focus:ring-neon-red rounded-none accent-neon-red" : "text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"}`}
                    />
                    <span>Select All</span>
                  </label>
                  
                  {checkedFileIds.size > 0 && (
                    <div className="flex items-center gap-2">
                       <button
                         onClick={handleBulkTranslateSelected}
                         disabled={isProcessing}
                         className={`flex items-center gap-1 text-xs px-2 py-1 transition-colors ${isDarkMode ? "bg-[#1a0505] border border-blood text-neon-red hover:bg-blood hover:text-white rounded-none font-tech shadow-[0_0_5px_rgba(255,51,51,0.2)]" : "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded"}`}
                       >
                         <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                         Translate
                       </button>
                       <button
                         onClick={handleBulkDeleteSelected}
                         disabled={isProcessing}
                         className={`flex items-center gap-1 text-xs px-2 py-1 transition-colors ${isDarkMode ? "bg-[#1a0a0a] border border-blood/80 text-red-500 hover:bg-[#2a0505] hover:text-neon-red rounded-none font-tech shadow-[0_0_5px_rgba(0,0,0,1)]" : "bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded"}`}
                       >
                         <Trash2 className="w-3 h-3" />
                         Delete
                       </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className={`flex-1 overflow-y-auto p-2 space-y-1 ${isDarkMode ? "bg-[#0a0a0a]" : "bg-white"}`}>
              {uploadProgress.isUploading && (
                <div className={`p-4 mb-2 flex flex-col gap-2 ${isDarkMode ? "bg-[#1a0505] rounded-none border border-blood text-neon-red font-tech uppercase shadow-[0_0_15px_rgba(255,51,51,0.15)]" : "bg-blue-50 rounded-lg border border-blue-100"}`}>
                  <div className={`flex items-center justify-between text-sm ${isDarkMode ? "tracking-wider text-neon-red" : "text-blue-700 font-medium"}`}>
                    <span className="flex items-center gap-2"><RefreshCw className={`w-4 h-4 animate-spin ${isDarkMode ? "drop-shadow-[0_0_5px_rgba(255,51,51,1)]" : ""}`} /> {isDarkMode ? "Synthesizing Data..." : "Parsing files..."}</span>
                    <span className={`${isDarkMode ? "text-red-400" : ""}`}>{uploadProgress.current} / {uploadProgress.total}</span>
                  </div>
                  <div className={`w-full h-1.5 relative overflow-hidden ${isDarkMode ? "bg-[#050505] border border-blood/30" : "bg-blue-200 rounded-full"}`}>
                    <div className={`h-full transition-all duration-200 ${isDarkMode ? "bg-neon-red shadow-[0_0_8px_rgba(255,51,51,1)]" : "bg-blue-600 rounded-full"}`} style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                  </div>
                </div>
              )}
              {translationProgress.isActive && (
                <div className={`p-4 mb-2 flex flex-col gap-2 ${isDarkMode ? "bg-[#1a0505] rounded-none border border-blood text-neon-red font-tech uppercase shadow-[0_0_15px_rgba(255,51,51,0.15)]" : "bg-blue-50 rounded-lg border border-blue-100"}`}>
                  <div className={`flex items-center justify-between text-sm ${isDarkMode ? "tracking-wider text-neon-red" : "text-blue-700 font-medium"}`}>
                    <span className="flex items-center gap-2"><RefreshCw className={`w-4 h-4 animate-spin ${isDarkMode ? "drop-shadow-[0_0_5px_rgba(255,51,51,1)]" : ""}`} /> {isDarkMode ? "Processing Feeds..." : "Translating files..."}</span>
                    <span className={`${isDarkMode ? "text-red-400" : ""}`}>{translationProgress.current} / {translationProgress.total}</span>
                  </div>
                  <div className={`w-full h-1.5 relative overflow-hidden ${isDarkMode ? "bg-[#050505] border border-blood/30" : "bg-blue-200 rounded-full"}`}>
                    <div className={`h-full transition-all duration-200 ${isDarkMode ? "bg-neon-red shadow-[0_0_8px_rgba(255,51,51,1)]" : "bg-blue-600 rounded-full"}`} style={{ width: `${(translationProgress.current / translationProgress.total) * 100}%` }}></div>
                  </div>
                </div>
              )}
              {files.length === 0 && !uploadProgress.isUploading ? (
                <div className={`h-full flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? "text-red-900/40 font-tech" : "text-gray-400"}`}>
                  <Upload className={`w-12 h-12 mb-3 ${isDarkMode ? "text-red-900/20" : "text-gray-300"}`} />
                  <p className={`text-sm ${isDarkMode ? "uppercase tracking-widest" : ""}`}>{isDarkMode ? <><span className="block mb-1">System Node Idle.</span>Await Data Injection.</> : "Upload MHT or ZIP files to begin"}</p>
                </div>
              ) : (
                files.map(f => (
                  <React.Fragment key={f.id}>
                    <div 
                      onClick={() => {
                        setSelectedFileId(f.id);
                        setMobileTab('preview');
                      }}
                      className={`p-3 cursor-pointer flex items-center justify-between group transition-colors border ${isDarkMode ? (selectedFileId === f.id ? "rounded-none bg-[#1a0505] border-blood/80 shadow-[inset_0_0_10px_rgba(255,51,51,0.1)]" : "rounded-none hover:bg-[#111] border-transparent hover:border-blood/30") : (selectedFileId === f.id ? "rounded-lg bg-blue-50 border-blue-200" : "rounded-lg hover:bg-gray-50 border-transparent")}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={checkedFileIds.has(f.id)}
                        onChange={(e) => toggleFileCheckbox(f.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-neon-red bg-[#050505] border-blood/50 rounded-none focus:ring-neon-red cursor-pointer accent-neon-red custom-checkbox"
                      />
                      <div className="flex items-center gap-3 overflow-hidden flex-1 px-3">
                        <div className={`truncate text-sm font-medium flex-1 ${isDarkMode ? "text-red-500 font-mono hover:text-neon-red" : "text-gray-800"}`} title={f.name}>{f.name}</div>
                        {f.status === 'done' ? (
                          <span className={`flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDarkMode ? "rounded-none bg-[#051a05] text-neon-green border border-neon-green/30 shadow-[0_0_8px_rgba(0,255,102,0.15)] font-tech" : "rounded-md bg-green-50 text-green-700 border border-green-200"}`}>
                             <CheckCircle2 className="w-3.5 h-3.5" /> {isDarkMode ? "Parsed" : "Done"}
                          </span>
                        ) : f.status === 'processing' ? (
                          <span className={`flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDarkMode ? "rounded-none bg-[#1a0f05] text-neon-amber border border-neon-amber/30 shadow-[0_0_8px_rgba(255,153,0,0.15)] font-tech" : "rounded-md bg-blue-50 text-blue-700 border border-blue-200"}`}>
                             <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {isDarkMode ? "Link" : "Translating"}
                          </span>
                        ) : f.status === 'error' ? (
                          <span className={`flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDarkMode ? "rounded-none bg-blood/30 text-neon-red border border-neon-red/50 shadow-[0_0_8px_rgba(255,51,51,0.2)] animate-pulse font-tech" : "rounded-md bg-red-50 text-red-700 border border-red-200"}`}>
                             <AlertCircle className="w-3.5 h-3.5" /> {isDarkMode ? "Fail" : "Error"}
                          </span>
                        ) : (
                          <span className={`flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDarkMode ? "rounded-none bg-[#111] text-red-800 border border-blood/30 font-tech" : "rounded-md bg-gray-50 text-gray-600 border border-gray-200"}`}>
                             <Clock className="w-3.5 h-3.5" /> {isDarkMode ? "Await" : "Pending"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => removeFile(f.id, e)}
                          className={`p-1 ${isDarkMode ? "text-red-900/60 hover:text-neon-red drop-shadow-[0_0_5px_rgba(255,51,51,1)] bg-[#1a0505] border-l border-blood/20 h-full" : "text-gray-400 hover:text-red-500 rounded-full"}`}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                    {selectedFileId === f.id && (
                      <div className={`px-3 pb-3 space-y-2 ${isDarkMode ? "bg-[#111] border-b border-blood/20 pt-2" : ""}`}>
                        <textarea
                          value={f.context || ''}
                          onChange={(e) => setFiles(prev => prev.map(file => file.id === f.id ? {...file, context: e.target.value} : file))}
                          placeholder="Specific translation instructions for this file..."
                          className={`w-full border p-2 text-xs outline-none min-h-[60px] ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red focus:shadow-[0_0_10px_rgba(255,51,51,0.2)] placeholder-red-900/40" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"}`}
                        />
                        <div className="flex items-center gap-2">
                           <Tag className={`w-3 h-3 ${isDarkMode ? "text-red-900/60" : "text-gray-400"}`} />
                           <input
                             type="text"
                             value={f.customTerms || ''}
                             onChange={(e) => {
                               const newTerms = e.target.value;
                               setFiles(prev => prev.map(file => {
                                 if (file.id === f.id) {
                                    return {
                                      ...file, 
                                      customTerms: newTerms, 
                                      originalHtml: processSovereignPriority(file.rawHtml, [globalCustomTerms, newTerms].filter(Boolean).join(','))
                                    };
                                 }
                                 return file;
                               }));
                             }}
                             placeholder="Custom terms to single out (comma separated)..."
                             className={`flex-1 border p-1.5 text-xs outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red focus:shadow-[inset_0_0_10px_rgba(255,51,51,0.2)] placeholder-red-900/40" : "rounded-md border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"}`}
                           />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>

            <div className={`p-4 border-t space-y-3 shrink-0 ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}>
              <button 
                onClick={handleTranslateAll}
                disabled={pendingCount === 0 || isProcessing}
                className={`w-full py-2.5 flex items-center justify-center gap-2 transition-all text-sm disabled:cursor-not-allowed ${isDarkMode ? "bg-blood text-white hover:bg-neon-red hover:text-black border border-neon-red disabled:bg-[#1a0505] disabled:border-blood/50 disabled:text-red-900/40 rounded-none font-tech uppercase tracking-widest shadow-[0_0_15px_rgba(139,0,0,0.3)]" : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium shadow-sm"}`}
              >
                {isProcessing ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Link Active...</>
                ) : (
                  <><Globe className="w-4 h-4" /> Engage Link ({pendingCount})</>
                )}
              </button>

              <div className="flex gap-2">
                <select 
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                  className={`flex-1 border p-2 focus:outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-red-500 text-xs font-tech uppercase focus:ring-1 focus:ring-neon-red" : "rounded-lg border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"}`}
                >
                  <option value="html">{isDarkMode ? "HTML Render" : "HTML"}</option>
                  <option value="pdf">{isDarkMode ? "PDF Block" : "PDF"}</option>
                  <option value="docx">{isDarkMode ? "Word Record" : "Word (DOC)"}</option>
                  <option value="json">{isDarkMode ? "JSON Raw" : "JSON"}</option>
                  <option value="md_code">MD Code (.md)</option>
                </select>
                
                {exportFormat === 'json' ? (
                  <div className="flex flex-1 gap-2">
                    <button 
                      onClick={handleDownload}
                      disabled={doneCount === 0 || isExporting}
                      className={`flex-1 py-2 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? "bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:border-neon-red text-neon-red rounded-none font-tech uppercase text-xs" : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm"}`}
                      title="Export as new JSON file"
                    >
                      {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isDarkMode ? "New Data" : "New"}
                    </button>
                    <button 
                      onClick={handleAppendToJsonClick}
                      disabled={doneCount === 0 || isExporting}
                      className={`flex-1 py-2 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? "bg-[#1a0a0a] border border-blood/50 hover:bg-[#2a0505] hover:border-neon-red text-neon-red rounded-none font-tech uppercase text-xs" : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm"}`}
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
                    className={`flex-1 py-2.5 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? "bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:text-white hover:border-neon-red text-neon-red rounded-none font-tech uppercase tracking-wide text-xs" : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm"}`}
                  >
                    {isExporting ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> {isDarkMode ? "Packaging..." : "Exporting..."}</>
                    ) : (
                      <><Download className="w-4 h-4" /> {isDarkMode ? "Export Data" : "Export"} ({doneCount})</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className={`w-full lg:w-2/3 flex-col h-full overflow-hidden ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'} ${isDarkMode ? "gap-6 p-1" : "gap-4"}`}>
            {selectedFile ? (
              <>
                {/* AI Interaction Console */}
                <div className={`shrink-0 flex flex-col min-h-0 relative ${isDarkMode ? "bg-[#0a0a0a] rounded-none border border-blood/50" : "bg-white rounded-xl border border-gray-200 shadow-sm"}`}>
                  <div className={`p-2 border-b flex items-center justify-between ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-3 h-3 ${isAiProcessing ? 'animate-spin' : ''} text-neon-red`} />
                      <span className={`text-[10px] ${isDarkMode ? "font-tech uppercase tracking-widest text-red-500" : "font-medium text-gray-700"}`}>AI Analysis Console</span>
                    </div>
                  </div>
                  <div className="p-3 flex gap-2">
                    <input 
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Ask the AI about this file (e.g. 'Extract all names')"
                      className={`flex-1 px-3 py-2 text-xs transition-all outline-none ${isDarkMode ? "bg-[#050505] border border-blood/30 text-neon-red placeholder:text-red-900/40 focus:border-neon-red" : "bg-white border border-gray-200 rounded-lg text-gray-700 focus:ring-1 focus:ring-blue-500"}`}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiInteraction()}
                    />
                    <button 
                      onClick={handleAiInteraction}
                      disabled={isAiProcessing || !aiQuery.trim()}
                      className={`px-4 py-2 text-xs transition-all disabled:opacity-50 ${isDarkMode ? "bg-blood/20 border border-blood/50 text-neon-red hover:bg-blood/40" : "bg-blue-600 text-white rounded-lg hover:bg-blue-700"}`}
                    >
                      Analyze
                    </button>
                  </div>
                  {aiResult && (
                    <div className={`mx-3 mb-3 p-3 text-xs overflow-auto max-h-40 border-t ${isDarkMode ? "border-blood/20 text-red-400 bg-[#050505]" : "border-gray-100 text-gray-600 bg-gray-50 rounded-lg"}`}>
                      <div className="font-tech text-[9px] uppercase text-red-900/50 mb-1">Response:</div>
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown>{aiResult}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`flex-1 overflow-hidden flex flex-col min-h-0 relative ${isDarkMode ? "bg-[#0a0a0a] rounded-none border border-blood/50 shadow-[0_0_20px_rgba(139,0,0,0.1)]" : "bg-white rounded-xl border border-gray-200 shadow-sm"}`}>
                 {isDarkMode && <div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none pointer-events-none">ROUTE_A_INPUT</div>}
                  <div className={`p-3 border-b shrink-0 flex items-center justify-between gap-2 ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <FileType className="w-4 h-4 text-neon-red" />
                      <span className={`text-sm ${isDarkMode ? "font-tech uppercase tracking-widest text-red-500" : "font-medium text-gray-700"}`}>{isDarkMode ? "Source Feed" : "Original HTML Preview"}</span>
                    </div>
                  </div>
                  {renderPreview(selectedFile.originalHtml, false)}
                </div>
                <div className="flex-1 bg-[#0a0a0a] rounded-none border border-blood/50 overflow-hidden flex flex-col shadow-[0_0_20px_rgba(139,0,0,0.1)] min-h-0 relative">
                 {isDarkMode && <div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none pointer-events-none">SYS_TRANSLATION_OUT</div>}
                  <div className={`p-3 border-b shrink-0 flex items-center justify-between gap-2 ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}>
                    <Globe className="w-4 h-4 text-neon-red animate-pulse" />
                    <span className={`text-sm ${isDarkMode ? "font-tech uppercase tracking-widest text-red-500" : "font-medium text-gray-700"}`}>{isDarkMode ? "Translated Feed" : "Translated HTML Preview"}</span>
                  </div>
                  {renderPreview(
                    selectedFile.translatedHtml, 
                    selectedFile.status === 'done', 
                    (val) => setFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, translatedHtml: val } : f)),
                    selectedFile.status === 'processing' ? (isDarkMode ? 'Initiating handshake...' : 'Translating...') : (isDarkMode ? 'Awaiting data link...' : 'Translated content will appear here...'),
                    selectedFile.status === 'processing'
                  )}
                </div>
              </>
            ) : (
              <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden ${isDarkMode ? "bg-[#0a0a0a] rounded-none border border-blood/30 text-red-900/40 shadow-[inset_0_0_50px_rgba(0,0,0,1)]" : "bg-white rounded-xl border border-gray-200 text-gray-400 shadow-sm"}`}>
                {isDarkMode && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none"></div>}
                <FileText className={`mb-4 ${isDarkMode ? "w-20 h-20 text-red-900/10 drop-shadow-[0_0_5px_rgba(255,0,0,0.2)]" : "w-16 h-16 text-gray-200"}`} />
                <p className={isDarkMode ? "font-tech text-xl uppercase tracking-[0.3em] text-red-900/50" : ""}>{isDarkMode ? "No Signal" : "Select a file from the list to preview its content"}</p>
                {isDarkMode && <div className="mt-4 flex gap-1 items-end h-4">
                  <div className="w-1 bg-red-900/20 h-1 animate-ping" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1 bg-red-900/20 h-2 animate-ping" style={{ animationDelay: "200ms" }}></div>
                  <div className="w-1 bg-red-900/20 h-3 animate-ping" style={{ animationDelay: "400ms" }}></div>
                  <div className="w-1 bg-red-900/20 h-4 animate-ping" style={{ animationDelay: "600ms" }}></div>
                </div>}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
