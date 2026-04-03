
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, Trash2, Download, Settings, Archive } from 'lucide-react';
import JSZip from 'jszip';

type ExportFormat = 'png' | 'jpeg' | 'jpg' | 'webp';

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done';
  resultBlob?: Blob;
  newName?: string;
}

const ImageConverter: React.FC = () => {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [mask, setMask] = useState('In_Dev_**.**.****_#');
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(0.9);
  const [keepOriginalName, setKeepOriginalName] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const getMimeType = (fmt: ExportFormat) => {
    switch (fmt) {
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'png': default: return 'image/png';
    }
  };

  const getOutputName = useCallback((originalName: string, index: number, currentMask: string, currentFormat: ExportFormat, keepOriginal: boolean) => {
    const ext = currentFormat;
    
    if (keepOriginal) {
        const namePart = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        return `${namePart}.${ext}`;
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}.${month}.${year}`;
    
    let name = currentMask
        .replace(/\*\*\.\*\*\.\*\*\*\*/g, dateStr)
        .replace(/#/g, String(index + 1));
    
    const lowerName = name.toLowerCase();
    if (!lowerName.endsWith(`.${ext}`)) {
        name += `.${ext}`;
    }
    return name;
  }, []);

  useEffect(() => {
    setFiles(prevFiles => prevFiles.map((f, index) => ({
        ...f,
        newName: getOutputName(f.file.name, index, mask, format, keepOriginalName)
    })));
  }, [mask, format, keepOriginalName, getOutputName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processIncomingFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const processIncomingFiles = (incoming: File[]) => {
    setFiles(prev => {
        const startIdx = prev.length;
        const newFiles = incoming
        .filter(f => f.type.startsWith('image/'))
        .map((f, i) => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            previewUrl: URL.createObjectURL(f),
            status: 'pending' as const,
            newName: getOutputName(f.name, startIdx + i, mask, format, keepOriginalName)
        }));
        return [...prev, ...newFiles];
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      processIncomingFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.previewUrl);
      
      const remaining = prev.filter(f => f.id !== id);
      return remaining.map((f, index) => ({
          ...f,
          newName: getOutputName(f.file.name, index, mask, format, keepOriginalName)
      }));
    });
  };

  const convertFiles = async () => {
    setIsProcessing(true);
    
    const processFile = async (qFile: QueuedFile): Promise<QueuedFile> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                    if (format === 'jpg' || format === 'jpeg') {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    ctx.drawImage(img, 0, 0);
                }
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({
                            ...qFile,
                            status: 'done',
                            resultBlob: blob,
                        });
                    } else {
                        resolve({ ...qFile, status: 'pending' });
                    }
                }, getMimeType(format), quality);
            };
            img.src = qFile.previewUrl;
        });
    };

    const results = [];
    for (let i = 0; i < files.length; i++) {
        const res = await processFile(files[i]);
        results.push(res);
    }

    setFiles(results);
    setIsProcessing(false);
  };

  const downloadAll = () => {
      files.filter(f => f.status === 'done' && f.resultBlob).forEach((f, i) => {
          setTimeout(() => {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(f.resultBlob!);
              a.download = f.newName || 'image';
              a.click();
              URL.revokeObjectURL(a.href);
          }, i * 300);
      });
  };

  const downloadZip = async () => {
      const doneFiles = files.filter(f => f.status === 'done' && f.resultBlob);
      if (doneFiles.length === 0) return;

      const zip = new JSZip();
      doneFiles.forEach(f => {
          zip.file(f.newName || 'image', f.resultBlob!);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `converted_images_${new Date().getTime()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
  };

  const hasDoneFiles = files.some(f => f.status === 'done');

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 sm:gap-6 animate-fade-in min-h-0">
      
      {/* Left Panel: Settings & Upload */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 sm:gap-6 flex-shrink-0 min-h-0">
         
         {/* Upload Zone */}
         <div 
           onDragOver={handleDragOver}
           onDrop={handleDrop}
           className="bg-white dark:bg-gray-900 rounded-3xl p-4 sm:p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col items-center justify-center text-center cursor-pointer flex-1 min-h-[120px] shadow-sm group"
           onClick={() => fileInputRef.current?.click()}
         >
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             multiple
             onChange={handleFileSelect}
             accept="image/png, image/jpeg, image/webp"
           />
           <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
           </div>
           <h3 className="text-xl font-bold text-gray-900 dark:text-white">Click or Drop Images</h3>
           <p className="text-base text-gray-500 dark:text-gray-400 mt-2">Supports JPG, PNG, WEBP</p>
         </div>

         {/* Configuration */}
         <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 sm:gap-5 flex-shrink-0 overflow-y-auto">
           <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h3>
           </div>

           <div className="space-y-5">
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Output Format</label>
                  <div className="grid grid-cols-4 gap-2">
                      {(['png', 'jpg', 'jpeg', 'webp'] as ExportFormat[]).map(fmt => (
                          <button
                              key={fmt}
                              onClick={() => setFormat(fmt)}
                              className={`py-2 rounded-xl text-sm font-medium transition-colors ${format === fmt ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                          >
                              {fmt.toUpperCase()}
                          </button>
                      ))}
                  </div>
              </div>

              {format !== 'png' && (
                   <div>
                      <div className="flex justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quality</label>
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{Math.round(quality * 100)}%</span>
                      </div>
                      <input 
                          type="range" 
                          min="0.1" 
                          max="1" 
                          step="0.1"
                          value={quality}
                          onChange={(e) => setQuality(parseFloat(e.target.value))}
                          className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                   </div>
              )}

              {/* Filename Settings */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <label className="flex items-center justify-between cursor-pointer mb-4">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Keep Original Filename</span>
                      <div className="relative">
                          <input 
                              type="checkbox" 
                              className="sr-only" 
                              checked={keepOriginalName} 
                              onChange={(e) => setKeepOriginalName(e.target.checked)} 
                          />
                          <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${keepOriginalName ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${keepOriginalName ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                  </label>

                  <div className={`transition-opacity duration-200 ${keepOriginalName ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filename Mask</label>
                      <input 
                          type="text"
                          value={mask}
                          onChange={(e) => setMask(e.target.value)}
                          disabled={keepOriginalName}
                          className="w-full border-2 border-gray-200 dark:border-gray-800 rounded-xl p-3 text-base focus:border-blue-500 focus:ring-0 outline-none font-mono disabled:bg-gray-50 bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:dark:bg-gray-800/50 transition-colors"
                          placeholder="File_###"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Use <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">**.**.****</span> for date and <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">#</span> for index.</p>
                  </div>
              </div>

              <button 
                  onClick={convertFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] mt-2"
              >
                  {isProcessing ? 'Converting...' : `Convert ${files.length > 0 ? files.length + ' Images' : ''}`}
              </button>
           </div>
         </div>
      </div>

      {/* Right Panel: File List */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Queue <span className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm py-0.5 px-2.5 rounded-full">{files.length}</span>
              </h3>
              <div className="flex items-center gap-3">
                  {hasDoneFiles && (
                      <>
                          <button 
                              onClick={downloadAll}
                              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                              <Download className="w-4 h-4" /> Download All
                          </button>
                          <button 
                              onClick={downloadZip}
                              className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                              <Archive className="w-4 h-4" /> Save as ZIP
                          </button>
                      </>
                  )}
                  {files.length > 0 && (
                      <button onClick={() => setFiles([])} className="text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" /> Clear
                      </button>
                  )}
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {files.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                      <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No images added yet</p>
                      <p className="text-sm mt-1">Upload images to start converting</p>
                  </div>
              ) : (
                  files.map((item) => (
                      <div key={item.id} className="flex items-center gap-5 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all group">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 border border-gray-200 dark:border-gray-700 relative">
                              <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                              {item.status === 'done' && (
                                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-[1px]">
                                      <div className="bg-green-500 text-white rounded-full p-1 shadow-sm">
                                          <Download className="w-4 h-4" />
                                      </div>
                                  </div>
                              )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                              {item.status === 'done' ? (
                                  <div>
                                      <p className="font-bold text-base text-gray-900 dark:text-white truncate">{item.newName}</p>
                                      <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-0.5 flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-green-500"></span> Ready to download
                                      </p>
                                  </div>
                              ) : (
                                  <div>
                                      <div className="flex items-center gap-3 mb-1">
                                          <p className="font-medium text-base text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{item.file.name}</p>
                                          <span className="text-gray-300 dark:text-gray-600">→</span>
                                          <p className="font-bold text-base text-gray-900 dark:text-white truncate">{item.newName}</p>
                                      </div>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">{(item.file.size / 1024).toFixed(1)} KB</p>
                                  </div>
                              )}
                          </div>

                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.status === 'done' && item.resultBlob ? (
                                  <a 
                                      href={URL.createObjectURL(item.resultBlob)} 
                                      download={item.newName}
                                      className="p-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                      title="Download"
                                  >
                                      <Download className="w-5 h-5" />
                                  </a>
                              ) : null}
                              <button 
                                  onClick={() => removeFile(item.id)}
                                  className="p-3 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                  title="Remove"
                              >
                                  <Trash2 className="w-5 h-5" />
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>

    </div>
  );
};

export default ImageConverter;
