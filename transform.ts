import * as fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

// I will find exact strings and replace them with `{isDarkMode ? 'dark-classes' : 'light-classes'}` 
// But wait, it's easier to just do string replacements on className="...".

const themeMap = [
  // Container & Header
  [
    'className="min-h-screen bg-[#050505] text-red-500 font-sans selection:bg-red-900/50 flex flex-col crt overflow-hidden relative"',
    'className={`min-h-screen flex flex-col relative ${isDarkMode ? "bg-[#050505] text-red-500 font-sans selection:bg-red-900/50 crt overflow-hidden" : "bg-gray-50 text-gray-900 font-sans selection:bg-blue-200"}`}'
  ],
  [
    'className="bg-[#0a0a0a] border-b-2 border-blood sticky top-0 z-10 shrink-0 shadow-[0_4px_30px_rgba(139,0,0,0.3)]"',
    'className={`sticky top-0 z-10 shrink-0 ${isDarkMode ? "bg-[#0a0a0a] border-b-2 border-blood shadow-[0_4px_30px_rgba(139,0,0,0.3)]" : "bg-white border-b border-gray-200 shadow-sm"}`}'
  ],
  [
    'className="w-6 h-6 text-neon-red animate-pulse"',
    'className={`w-6 h-6 ${isDarkMode ? "text-neon-red animate-pulse" : "text-blue-600"}`}'
  ],
  [
    'className="text-xl font-tech text-neon-red drop-shadow-[0_0_8px_rgba(255,51,51,0.8)] uppercase tracking-[0.2em]"',
    'className={`text-xl ${isDarkMode ? "font-tech text-neon-red drop-shadow-[0_0_8px_rgba(255,51,51,0.8)] uppercase tracking-[0.2em]" : "font-semibold tracking-tight"}`}'
  ],
  [
    'className="p-2 rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20 transition-colors flex items-center gap-2"',
    'className={`p-2 transition-colors flex items-center gap-2 ${isDarkMode ? "rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20" : "rounded-full hover:bg-gray-100"}`}'
  ],
  [
    'className="p-2 rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20 transition-colors"',
    'className={`p-2 transition-colors flex items-center justify-center ${isDarkMode ? "rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20" : "rounded-full hover:bg-gray-100"}`}'
  ],
  [
    'className="w-5 h-5 text-red-500 hover:text-neon-red"',
    'className={`w-5 h-5 ${isDarkMode ? "text-red-500 hover:text-neon-red" : "text-gray-600 hover:text-gray-900"}`}'
  ],

  // Settings Panel
  [
    'className="bg-[#111111] p-4 rounded-none shadow-[0_0_20px_rgba(139,0,0,0.15)] border border-blood/50 animate-in fade-in slide-in-from-top-2 shrink-0 relative overflow-hidden"',
    'className={`p-4 animate-in fade-in slide-in-from-top-2 shrink-0 relative overflow-hidden ${isDarkMode ? "bg-[#111111] rounded-none shadow-[0_0_20px_rgba(139,0,0,0.15)] border border-blood/50" : "bg-white rounded-xl shadow-sm border border-gray-200"}`}'
  ],
  [
    'className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/40 select-none"',
    'className={`absolute top-0 right-0 p-1 font-tech text-[10px] select-none ${isDarkMode ? "text-red-900/40" : "text-gray-300"}`}'
  ],
  [
    'className="text-sm font-semibold text-neon-red uppercase tracking-wider font-tech"',
    'className={`text-sm font-semibold uppercase tracking-wider ${isDarkMode ? "text-neon-red font-tech" : "text-gray-700 font-sans"}`}'
  ],
  [
    'className="text-xs flex items-center gap-1.5 text-neon-red hover:text-white bg-[#1a0505] hover:bg-blood/80 px-2.5 py-1 rounded-none border border-blood/50 transition-colors font-tech uppercase"',
    'className={`text-xs flex items-center gap-1.5 px-2.5 py-1 transition-colors ${isDarkMode ? "text-neon-red hover:text-white bg-[#1a0505] hover:bg-blood/80 rounded-none border border-blood/50 font-tech uppercase" : "text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md font-medium font-sans"}`}'
  ],
  [
    'className="mb-6 p-4 bg-[#0a0a0a] border border-blood/40 rounded-none text-sm text-red-400 font-tech space-y-3 shadow-[inset_0_0_15px_rgba(255,51,51,0.05)]"',
    'className={`mb-6 p-4 text-sm space-y-3 ${isDarkMode ? "bg-[#0a0a0a] border border-blood/40 rounded-none text-red-400 font-tech shadow-[inset_0_0_15px_rgba(255,51,51,0.05)]" : "bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-sans"}`}'
  ],
  [
    'className="font-semibold text-neon-red border-b border-blood/50 pb-2 flex items-center gap-2"',
    'className={`font-semibold pb-2 flex items-center gap-2 ${isDarkMode ? "text-neon-red border-b border-blood/50" : "text-gray-900 border-b border-gray-200"}`}'
  ],
  [
    'className="space-y-2 list-disc list-inside opacity-90"',
    'className={`space-y-2 list-disc list-inside ${isDarkMode ? "opacity-90" : ""}`}'
  ],

  // Form elements inside settings
  [
    'className="block text-sm font-tech text-red-500 tracking-wide mb-1"',
    'className={`block text-sm mb-1 ${isDarkMode ? "font-tech text-red-500 tracking-wide" : "font-medium text-gray-700"}`}'
  ],
  [
    'className="block text-sm font-tech text-red-500 tracking-wide mb-1 flex items-center justify-between"',
    'className={`block text-sm mb-1 flex items-center justify-between ${isDarkMode ? "font-tech text-red-500 tracking-wide" : "font-medium text-gray-700"}`}'
  ],
  [
    'className="text-red-900/60 text-xs font-normal"',
    'className={`text-xs font-normal ${isDarkMode ? "text-red-900/60" : "text-gray-400"}`}'
  ],
  [
    'className="w-full rounded-none border-blood/40 bg-[#0a0a0a] text-red-400 border p-2 text-sm focus:ring-1 focus:ring-neon-red shadow-[0_0_10px_rgba(255,51,51,0.2)] outline-none"',
    'className={`w-full border p-2 text-sm outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-red-400 focus:ring-1 focus:ring-neon-red shadow-[0_0_10px_rgba(255,51,51,0.2)]" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}`}'
  ],
  [
    'className="w-full rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red border p-2 text-sm outline-none focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)]"',
    'className={`w-full border p-2 text-sm outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)]" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}`}'
  ],
  [
    'className="w-full rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red border p-2 text-sm outline-none focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40"',
    'className={`w-full border p-2 text-sm outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"}`}'
  ],
  [
    'className="w-full rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red border p-2 text-sm outline-none focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40 min-h-[60px]"',
    'className={`w-full border p-2 text-sm outline-none min-h-[60px] ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 placeholder-gray-400"}`}'
  ],
  [
    'className="mt-4 pt-4 border-t border-blood/50"',
    'className={`mt-4 pt-4 border-t ${isDarkMode ? "border-blood/50" : "border-gray-200"}`}'
  ],
  [
    'className="mt-4 pt-4 border-t border-blood/50 space-y-4"',
    'className={`mt-4 pt-4 border-t space-y-4 ${isDarkMode ? "border-blood/50" : "border-gray-200"}`}'
  ],
  [
    'className="flex-1 rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red border p-2 text-sm outline-none focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40"',
    'className={`flex-1 border p-2 text-sm outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)] placeholder-red-900/40" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 placeholder-gray-400"}`}'
  ],
  [
    'className="px-4 py-2 bg-blood/80 border border-neon-red text-white uppercase font-tech tracking-wider text-sm hover:bg-neon-red hover:text-black disabled:opacity-50 disabled:bg-[#1a0505] disabled:border-blood/50 flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(255,51,51,0.2)]"',
    'className={`px-4 py-2 flex items-center gap-2 transition-all text-sm disabled:opacity-50 ${isDarkMode ? "bg-blood/80 border border-neon-red text-white uppercase font-tech tracking-wider hover:bg-neon-red hover:text-black disabled:bg-[#1a0505] disabled:border-blood/50 shadow-[0_0_10px_rgba(255,51,51,0.2)]" : "bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"}`}'
  ],
  [
    'className="mt-2 text-xs font-tech text-red-400 flex items-center gap-2"',
    'className={`mt-2 text-xs flex items-center gap-2 ${isDarkMode ? "font-tech text-red-400" : "text-gray-600"}`}'
  ],
  [
    'className="font-medium tracking-wide uppercase"',
    'className={`font-medium ${isDarkMode ? "tracking-wide uppercase" : ""}`}'
  ],
  [
    'className="flex-1 h-1.5 bg-[#0a0a0a] border border-blood/30 overflow-hidden relative"',
    'className={`flex-1 h-1.5 overflow-hidden relative ${isDarkMode ? "bg-[#0a0a0a] border border-blood/30" : "bg-gray-200 rounded-full"}`}'
  ],
  [
    'className="h-full bg-neon-red shadow-[0_0_8px_rgba(255,51,51,0.8)] transition-all duration-200"',
    'className={`h-full transition-all duration-200 ${isDarkMode ? "bg-neon-red shadow-[0_0_8px_rgba(255,51,51,0.8)]" : "bg-blue-600"}`}'
  ],
  [
    'className="block text-sm font-tech text-red-500 tracking-wide mb-1 flex items-center gap-1"',
    'className={`block text-sm mb-1 flex items-center gap-1 ${isDarkMode ? "font-tech text-red-500 tracking-wide" : "font-medium text-gray-700"}`}'
  ],
  [
    'className="flex items-center gap-2 w-full rounded-none border-blood/40 bg-[#0a0a0a] border p-2 focus-within:ring-1 focus-within:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)]"',
    'className={`flex items-center gap-2 w-full border p-2 ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] focus-within:ring-1 focus-within:ring-neon-red shadow-[inset_0_0_5px_rgba(255,51,51,0.1)]" : "rounded-lg border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500"}`}'
  ],
  [
    'className="w-full text-sm font-tech text-neon-red outline-none bg-transparent placeholder-red-900/40"',
    'className={`w-full text-sm outline-none bg-transparent ${isDarkMode ? "font-tech text-neon-red placeholder-red-900/40" : "text-gray-900 placeholder-gray-400"}`}'
  ],
  [
    'className="text-xs font-tech text-red-400 flex items-start gap-2 p-3 bg-[#1a0505] border border-blood/50 shadow-[inset_0_0_10px_rgba(255,51,51,0.05)]"',
    'className={`text-xs flex items-start gap-2 p-3 ${isDarkMode ? "font-tech text-red-400 bg-[#1a0505] border border-blood/50 shadow-[inset_0_0_10px_rgba(255,51,51,0.05)]" : "text-gray-500 bg-blue-50/50 rounded border border-blue-100"}`}'
  ],
  [
    'className="leading-relaxed"',
    'className={`${isDarkMode ? "leading-relaxed" : ""}`}'
  ],
  [
    'className="bg-[#050505] border border-blood/30 px-1 py-0.5 text-neon-red font-mono text-[10px]"',
    'className={`px-1 py-0.5 font-mono text-[10px] ${isDarkMode ? "bg-[#050505] border border-blood/30 text-neon-red" : "bg-white rounded text-blue-700"}`}'
  ],
  
  // Global Error
  [
    'className="bg-[#1a0505] text-neon-red p-4 rounded-none text-sm border border-red-900/50 flex items-start gap-2 shrink-0 animate-pulse font-tech shadow-[0_0_15px_rgba(255,51,51,0.2)]"',
    'className={`p-4 text-sm border flex items-start gap-2 shrink-0 ${isDarkMode ? "bg-[#1a0505] text-neon-red rounded-none border-red-900/50 animate-pulse font-tech shadow-[0_0_15px_rgba(255,51,51,0.2)]" : "bg-red-50 text-red-700 rounded-xl border-red-100"}`}'
  ],

  // Left Column
  [
    'className={`w-full lg:w-1/3 flex-col gap-0 bg-[#0a0a0a] rounded-none border border-blood/50 shadow-[0_0_20px_rgba(139,0,0,0.15)] overflow-hidden min-h-[300px] lg:min-h-0 relative ${mobileTab === \'list\' ? \'flex\' : \'hidden lg:flex\'}`}',
    'className={`w-full lg:w-1/3 flex-col overflow-hidden min-h-[300px] lg:min-h-0 relative ${mobileTab === "list" ? "flex" : "hidden lg:flex"} ${isDarkMode ? "gap-0 bg-[#0a0a0a] rounded-none border border-blood/50 shadow-[0_0_20px_rgba(139,0,0,0.15)]" : "gap-4 bg-white rounded-xl border border-gray-200 shadow-sm"}`}'
  ],
  [
    'className="p-4 border-b border-blood flex flex-col gap-3 bg-[#111] shrink-0"',
    'className={`p-4 border-b flex flex-col gap-3 shrink-0 ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}'
  ],
  [
    'className="font-tech text-neon-red uppercase tracking-wider flex items-center gap-2"',
    'className={`flex items-center gap-2 ${isDarkMode ? "font-tech text-neon-red uppercase tracking-wider" : "font-medium text-gray-900"}`}'
  ],
  [
    'className="w-5 h-5 text-red-900/80"',
    'className={`w-5 h-5 ${isDarkMode ? "text-red-900/80" : "text-gray-500"}`}'
  ],
  [
    'className="flex items-center gap-1.5 text-sm bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:text-white hover:border-neon-red text-neon-red px-3 py-1.5 rounded-none transition-all font-tech uppercase"',
    'className={`flex items-center gap-1.5 text-sm px-3 py-1.5 transition-all ${isDarkMode ? "bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:text-white hover:border-neon-red text-neon-red rounded-none font-tech uppercase" : "bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-gray-700"}`}'
  ],
  [
    'className="flex relative items-center gap-2 text-sm justify-between w-full pt-2 border-t border-blood/30"',
    'className={`flex relative items-center gap-2 text-sm justify-between w-full pt-2 border-t ${isDarkMode ? "border-blood/30" : "border-gray-300"}`}'
  ],
  [
    'className="flex items-center gap-2 cursor-pointer text-red-500 font-tech uppercase hover:text-neon-red transition-colors"',
    'className={`flex items-center gap-2 cursor-pointer transition-colors ${isDarkMode ? "text-red-500 font-tech uppercase hover:text-neon-red" : "text-gray-600 hover:text-gray-900"}`}'
  ],
  [
    'className="w-4 h-4 text-neon-red bg-[#050505] border-blood/50 focus:ring-neon-red rounded-none accent-neon-red custom-checkbox"',
    'className={`w-4 h-4 focus:ring-offset-0 ${isDarkMode ? "text-neon-red bg-[#050505] border-blood/50 focus:ring-neon-red rounded-none accent-neon-red" : "text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"}`}'
  ],
  [
    'className="flex items-center gap-1 text-xs px-2 py-1 bg-[#1a0505] border border-blood text-neon-red hover:bg-blood hover:text-white rounded-none font-tech transition-colors shadow-[0_0_5px_rgba(255,51,51,0.2)]"',
    'className={`flex items-center gap-1 text-xs px-2 py-1 transition-colors ${isDarkMode ? "bg-[#1a0505] border border-blood text-neon-red hover:bg-blood hover:text-white rounded-none font-tech shadow-[0_0_5px_rgba(255,51,51,0.2)]" : "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded"}`}'
  ],
  [
    'className="flex items-center gap-1 text-xs px-2 py-1 bg-[#1a0a0a] border border-blood/80 text-red-500 hover:bg-[#2a0505] hover:text-neon-red rounded-none font-tech transition-colors shadow-[0_0_5px_rgba(0,0,0,1)]"',
    'className={`flex items-center gap-1 text-xs px-2 py-1 transition-colors ${isDarkMode ? "bg-[#1a0a0a] border border-blood/80 text-red-500 hover:bg-[#2a0505] hover:text-neon-red rounded-none font-tech shadow-[0_0_5px_rgba(0,0,0,1)]" : "bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded"}`}'
  ],

  // File List Items
  [
    'className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#0a0a0a]"',
    'className={`flex-1 overflow-y-auto p-2 space-y-1 ${isDarkMode ? "bg-[#0a0a0a]" : "bg-white"}`}'
  ],
  [
    'className="p-4 mb-2 bg-[#1a0505] rounded-none border border-blood text-neon-red font-tech uppercase flex flex-col gap-2 shadow-[0_0_15px_rgba(255,51,51,0.15)]"',
    'className={`p-4 mb-2 flex flex-col gap-2 ${isDarkMode ? "bg-[#1a0505] rounded-none border border-blood text-neon-red font-tech uppercase shadow-[0_0_15px_rgba(255,51,51,0.15)]" : "bg-blue-50 rounded-lg border border-blue-100"}`}'
  ],
  [
    'className="flex items-center justify-between text-sm tracking-wider"',
    'className={`flex items-center justify-between text-sm ${isDarkMode ? "tracking-wider text-neon-red" : "text-blue-700 font-medium"}`}'
  ],
  [
    'className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin drop-shadow-[0_0_5px_rgba(255,51,51,1)]" /> Synthesizing Data...</span>',
    'className="flex items-center gap-2"><RefreshCw className={`w-4 h-4 animate-spin ${isDarkMode ? "drop-shadow-[0_0_5px_rgba(255,51,51,1)]" : ""}`} /> {isDarkMode ? "Synthesizing Data..." : "Parsing files..."}</span>'
  ],
  [
    'className="text-red-400"',
    'className={`${isDarkMode ? "text-red-400" : ""}`}'
  ],
  [
    'className="w-full bg-[#050505] border border-blood/30 h-1.5 relative overflow-hidden"',
    'className={`w-full h-1.5 relative overflow-hidden ${isDarkMode ? "bg-[#050505] border border-blood/30" : "bg-blue-200 rounded-full"}`}'
  ],
  [
    'className="bg-neon-red h-full transition-all duration-200 shadow-[0_0_8px_rgba(255,51,51,1)]"',
    'className={`h-full transition-all duration-200 ${isDarkMode ? "bg-neon-red shadow-[0_0_8px_rgba(255,51,51,1)]" : "bg-blue-600 rounded-full"}`}'
  ],
  [
    'className="h-full flex flex-col items-center justify-center text-red-900/40 p-6 text-center font-tech"',
    'className={`h-full flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? "text-red-900/40 font-tech" : "text-gray-400"}`}'
  ],
  [
    'className="w-12 h-12 mb-3 text-red-900/20"',
    'className={`w-12 h-12 mb-3 ${isDarkMode ? "text-red-900/20" : "text-gray-300"}`}'
  ],
  [
    'className="text-sm uppercase tracking-widest">System Node Idle.<br/>Await Data Injection.</p>',
    'className={`text-sm ${isDarkMode ? "uppercase tracking-widest" : ""}`}>{isDarkMode ? <><span className="block mb-1">System Node Idle.</span>Await Data Injection.</> : "Upload MHT or ZIP files to begin"}</p>'
  ],
  [
    'className={`p-3 rounded-none cursor-pointer flex items-center justify-between group transition-colors border ${selectedFileId === f.id ? \'bg-[#1a0505] border-blood/80 shadow-[inset_0_0_10px_rgba(255,51,51,0.1)]\' : \'hover:bg-[#111] border-transparent hover:border-blood/30\'}`}',
    'className={`p-3 cursor-pointer flex items-center justify-between group transition-colors border ${isDarkMode ? (selectedFileId === f.id ? "rounded-none bg-[#1a0505] border-blood/80 shadow-[inset_0_0_10px_rgba(255,51,51,0.1)]" : "rounded-none hover:bg-[#111] border-transparent hover:border-blood/30") : (selectedFileId === f.id ? "rounded-lg bg-blue-50 border-blue-200" : "rounded-lg hover:bg-gray-50 border-transparent")}`}'
  ],
  [
    'className="truncate text-sm font-medium text-red-500 flex-1 font-mono hover:text-neon-red"',
    'className={`truncate text-sm font-medium flex-1 ${isDarkMode ? "text-red-500 font-mono hover:text-neon-red" : "text-gray-800"}`}'
  ],
  [
    'className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-none bg-[#051a05] text-neon-green border border-neon-green/30 shadow-[0_0_8px_rgba(0,255,102,0.15)] font-tech"',
    'className={`flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDarkMode ? "rounded-none bg-[#051a05] text-neon-green border border-neon-green/30 shadow-[0_0_8px_rgba(0,255,102,0.15)] font-tech" : "rounded-md bg-green-50 text-green-700 border border-green-200"}`}'
  ],
  [
    '<CheckCircle2 className="w-3.5 h-3.5" /> Parsed',
    '<CheckCircle2 className="w-3.5 h-3.5" /> {isDarkMode ? "Parsed" : "Done"}'
  ],
  [
    'className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-none bg-[#1a0f05] text-neon-amber border border-neon-amber/30 shadow-[0_0_8px_rgba(255,153,0,0.15)] font-tech"',
    'className={`flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDarkMode ? "rounded-none bg-[#1a0f05] text-neon-amber border border-neon-amber/30 shadow-[0_0_8px_rgba(255,153,0,0.15)] font-tech" : "rounded-md bg-blue-50 text-blue-700 border border-blue-200"}`}'
  ],
  [
    '<RefreshCw className="w-3.5 h-3.5 animate-spin" /> Link',
    '<RefreshCw className="w-3.5 h-3.5 animate-spin" /> {isDarkMode ? "Link" : "Translating"}'
  ],
  [
    'className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-none bg-blood/30 text-neon-red border border-neon-red/50 shadow-[0_0_8px_rgba(255,51,51,0.2)] animate-pulse font-tech"',
    'className={`flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDarkMode ? "rounded-none bg-blood/30 text-neon-red border border-neon-red/50 shadow-[0_0_8px_rgba(255,51,51,0.2)] animate-pulse font-tech" : "rounded-md bg-red-50 text-red-700 border border-red-200"}`}'
  ],
  [
    '<AlertCircle className="w-3.5 h-3.5" /> Fail',
    '<AlertCircle className="w-3.5 h-3.5" /> {isDarkMode ? "Fail" : "Error"}'
  ],
  [
    'className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-none bg-[#111] text-red-800 border border-blood/30 font-tech"',
    'className={`flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDarkMode ? "rounded-none bg-[#111] text-red-800 border border-blood/30 font-tech" : "rounded-md bg-gray-50 text-gray-600 border border-gray-200"}`}'
  ],
  [
    '<Clock className="w-3.5 h-3.5" /> Await',
    '<Clock className="w-3.5 h-3.5" /> {isDarkMode ? "Await" : "Pending"}'
  ],
  [
    'className="text-red-900/60 hover:text-neon-red drop-shadow-[0_0_5px_rgba(255,51,51,1)] p-1 bg-[#1a0505] border-l border-blood/20 h-full"',
    'className={`p-1 ${isDarkMode ? "text-red-900/60 hover:text-neon-red drop-shadow-[0_0_5px_rgba(255,51,51,1)] bg-[#1a0505] border-l border-blood/20 h-full" : "text-gray-400 hover:text-red-500 rounded-full"}`}'
  ],
  [
    'className="px-3 pb-3 space-y-2 bg-[#111] border-b border-blood/20 pt-2"',
    'className={`px-3 pb-3 space-y-2 ${isDarkMode ? "bg-[#111] border-b border-blood/20 pt-2" : ""}`}'
  ],
  [
    'className="w-full rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red border p-2 text-xs focus:ring-1 focus:ring-neon-red focus:shadow-[0_0_10px_rgba(255,51,51,0.2)] outline-none placeholder-red-900/40 min-h-[60px]"',
    'className={`w-full border p-2 text-xs outline-none min-h-[60px] ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red focus:shadow-[0_0_10px_rgba(255,51,51,0.2)] placeholder-red-900/40" : "rounded-lg border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"}`}'
  ],
  [
    'className="w-3 h-3 text-red-900/60"',
    'className={`w-3 h-3 ${isDarkMode ? "text-red-900/60" : "text-gray-400"}`}'
  ],
  [
    'className="flex-1 rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red border p-1.5 text-xs focus:ring-1 focus:ring-neon-red focus:shadow-[inset_0_0_10px_rgba(255,51,51,0.2)] outline-none placeholder-red-900/40"',
    'className={`flex-1 border p-1.5 text-xs outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-neon-red focus:ring-1 focus:ring-neon-red focus:shadow-[inset_0_0_10px_rgba(255,51,51,0.2)] placeholder-red-900/40" : "rounded-md border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"}`}'
  ],
  [
    'className="p-4 border-t border-blood bg-[#111] space-y-3 shrink-0"',
    'className={`p-4 border-t space-y-3 shrink-0 ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}'
  ],
  [
    'className="w-full py-2.5 bg-blood text-white hover:bg-neon-red hover:text-black border border-neon-red disabled:bg-[#1a0505] disabled:border-blood/50 disabled:cursor-not-allowed disabled:text-red-900/40 rounded-none font-tech uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,0,0,0.3)] text-sm"',
    'className={`w-full py-2.5 flex items-center justify-center gap-2 transition-all text-sm disabled:cursor-not-allowed ${isDarkMode ? "bg-blood text-white hover:bg-neon-red hover:text-black border border-neon-red disabled:bg-[#1a0505] disabled:border-blood/50 disabled:text-red-900/40 rounded-none font-tech uppercase tracking-widest shadow-[0_0_15px_rgba(139,0,0,0.3)]" : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium shadow-sm"}`}'
  ],
  [
    'className="flex-1 rounded-none border-blood/40 bg-[#0a0a0a] text-red-500 border p-2 text-xs font-tech uppercase focus:ring-1 focus:ring-neon-red outline-none"',
    'className={`flex-1 border p-2 focus:outline-none ${isDarkMode ? "rounded-none border-blood/40 bg-[#0a0a0a] text-red-500 text-xs font-tech uppercase focus:ring-1 focus:ring-neon-red" : "rounded-lg border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"}`}'
  ],
  [
    '<option value="html">HTML Render</option>',
    '<option value="html">{isDarkMode ? "HTML Render" : "HTML"}</option>'
  ],
  [
    '<option value="pdf">PDF Block</option>',
    '<option value="pdf">{isDarkMode ? "PDF Block" : "PDF"}</option>'
  ],
  [
    '<option value="docx">Word Record</option>',
    '<option value="docx">{isDarkMode ? "Word Record" : "Word (DOC)"}</option>'
  ],
  [
    '<option value="json">JSON Raw</option>',
    '<option value="json">{isDarkMode ? "JSON Raw" : "JSON"}</option>'
  ],
  [
    'className="flex-1 py-1 bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:border-neon-red disabled:opacity-50 disabled:cursor-not-allowed text-neon-red rounded-none font-tech uppercase flex items-center justify-center gap-1.5 transition-all shadow-sm text-xs"',
    'className={`flex-1 py-2 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? "bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:border-neon-red text-neon-red rounded-none font-tech uppercase text-xs" : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm"}`}'
  ],
  [
    '<RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />',
    '<RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />'
  ],
  [
    'New Data',
    '{isDarkMode ? "New Data" : "New"}'
  ],
  [
    'className="flex-1 py-1 bg-[#1a0a0a] border border-blood/50 hover:bg-[#2a0505] hover:border-neon-red disabled:opacity-50 disabled:cursor-not-allowed text-neon-red rounded-none font-tech uppercase flex items-center justify-center gap-1.5 transition-all shadow-sm text-xs"',
    'className={`flex-1 py-2 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? "bg-[#1a0a0a] border border-blood/50 hover:bg-[#2a0505] hover:border-neon-red text-neon-red rounded-none font-tech uppercase text-xs" : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm"}`}'
  ],
  [
    '<FilePlus className="w-3.5 h-3.5" />',
    '<FilePlus className="w-4 h-4" />'
  ],
  [
    'className="flex-1 py-2 bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:text-white hover:border-neon-red disabled:opacity-50 disabled:cursor-not-allowed text-neon-red rounded-none font-tech uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-sm text-xs"',
    'className={`flex-1 py-2.5 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? "bg-[#1a0505] border border-blood/50 hover:bg-blood/40 hover:text-white hover:border-neon-red text-neon-red rounded-none font-tech uppercase tracking-wide text-xs" : "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm"}`}'
  ],
  [
    '<><RefreshCw className="w-4 h-4 animate-spin" /> Packaging...</>',
    '<><RefreshCw className="w-4 h-4 animate-spin" /> {isDarkMode ? "Packaging..." : "Exporting..."}</>'
  ],
  [
    '<><Download className="w-4 h-4" /> Export Data ({doneCount})</>',
    '<><Download className="w-4 h-4" /> {isDarkMode ? "Export Data" : "Export"} ({doneCount})</>'
  ],
  
  // Right Column
  [
    'className={`w-full lg:w-2/3 flex-col gap-6 ${mobileTab === \'preview\' ? \'flex\' : \'hidden lg:flex\'} h-full overflow-hidden p-1`}',
    'className={`w-full lg:w-2/3 flex-col h-full overflow-hidden ${mobileTab === \'preview\' ? \'flex\' : \'hidden lg:flex\'} ${isDarkMode ? "gap-6 p-1" : "gap-4"}`}'
  ],
  [
    'className="flex-1 bg-[#0a0a0a] rounded-none border border-blood/50 overflow-hidden flex flex-col shadow-[0_0_20px_rgba(139,0,0,0.1)] min-h-0 relative"',
    'className={`flex-1 overflow-hidden flex flex-col min-h-0 relative ${isDarkMode ? "bg-[#0a0a0a] rounded-none border border-blood/50 shadow-[0_0_20px_rgba(139,0,0,0.1)]" : "bg-white rounded-xl border border-gray-200 shadow-sm"}`}'
  ],
  [
    'className="p-3 border-b border-blood flex items-center justify-between gap-2 bg-[#111] shrink-0"',
    'className={`p-3 border-b shrink-0 flex items-center justify-between gap-2 ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}'
  ],
  [
    'className="p-3 border-b border-blood flex items-center gap-2 bg-[#111] shrink-0"',
    'className={`p-3 border-b shrink-0 flex items-center justify-between gap-2 ${isDarkMode ? "border-blood bg-[#111]" : "border-gray-200 bg-gray-50"}`}'
  ],
  [
    'className="text-sm font-tech uppercase tracking-widest text-red-500">Source Feed</span>',
    'className={`text-sm ${isDarkMode ? "font-tech uppercase tracking-widest text-red-500" : "font-medium text-gray-700"}`}>{isDarkMode ? "Source Feed" : "Original HTML Preview"}</span>'
  ],
  [
    'className="text-sm font-tech uppercase tracking-widest text-red-500">Translated Feed</span>',
    'className={`text-sm ${isDarkMode ? "font-tech uppercase tracking-widest text-red-500" : "font-medium text-gray-700"}`}>{isDarkMode ? "Translated Feed" : "Translated HTML Preview"}</span>'
  ],
  [
    'className="flex-1 flex flex-col items-center justify-center bg-[#050505] text-red-900/60 p-6 font-tech uppercase tracking-widest relative overflow-hidden"',
    'className={`flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden ${isDarkMode ? "bg-[#050505] text-red-900/60 font-tech uppercase tracking-widest" : "bg-gray-50/50 text-gray-500"}`}'
  ],
  [
    'className="w-10 h-10 animate-spin mb-4 text-neon-red drop-shadow-[0_0_10px_rgba(255,51,51,0.8)]"',
    'className={`animate-spin mb-4 ${isDarkMode ? "w-10 h-10 text-neon-red drop-shadow-[0_0_10px_rgba(255,51,51,0.8)]" : "w-8 h-8 text-blue-500"}`}'
  ],
  [
    'className="font-medium text-neon-red drop-shadow-[0_0_5px_rgba(255,51,51,0.5)]">Establishing Link...</p>',
    'className={`font-medium ${isDarkMode ? "text-neon-red drop-shadow-[0_0_5px_rgba(255,51,51,0.5)]" : ""}`}>{isDarkMode ? "Establishing Link..." : "Translating document..."}</p>'
  ],
  [
    'className="text-[10px] mt-2 text-red-900/40 tracking-[0.3em]">Stand by for data burst.</p>',
    'className={`mt-2 ${isDarkMode ? "text-[10px] text-red-900/40 tracking-[0.3em]" : "text-xs text-gray-400"}`}>{isDarkMode ? "Stand by for data burst." : "This may take a moment for large files"}</p>'
  ],
  [
    'className="w-full flex-1 p-4 resize-none outline-none font-mono text-xs text-red-900/30 bg-[#0a0a0a] min-h-0 placeholder-red-900/20 shadow-[inset_0_0_20px_rgba(0,0,0,1)] selection:bg-red-900/50 cursor-not-allowed"',
    'className={`w-full flex-1 p-4 resize-none outline-none font-mono text-xs min-h-0 ${isDarkMode ? "text-red-900/30 bg-[#0a0a0a] placeholder-red-900/20 shadow-[inset_0_0_20px_rgba(0,0,0,1)] selection:bg-red-900/50 cursor-not-allowed" : "text-gray-400 bg-gray-50/50"}`}'
  ],
  [
    'className="flex-1 flex flex-col relative min-h-0 bg-[#0a0a0a]"',
    'className={`flex-1 flex flex-col relative min-h-0 ${isDarkMode ? "bg-[#0a0a0a]" : ""}`}'
  ],
  [
    'className="bg-[#1a0f05] text-neon-amber text-xs p-2 border-b border-blood flex items-center gap-2 shrink-0 font-tech shadow-[inset_0_0_10px_rgba(255,153,0,0.1)]"',
    'className={`text-xs px-3 py-2 border-b flex items-center gap-2 shrink-0 ${isDarkMode ? "bg-[#1a0f05] text-neon-amber border-blood font-tech shadow-[inset_0_0_10px_rgba(255,153,0,0.1)]" : "bg-amber-50 text-amber-700 border-amber-200"}`}'
  ],
  [
    'className="w-4 h-4 shrink-0 drop-shadow-[0_0_5px_rgba(255,153,0,0.8)]"',
    'className={`w-4 h-4 shrink-0 ${isDarkMode ? "drop-shadow-[0_0_5px_rgba(255,153,0,0.8)]" : ""}`}'
  ],
  [
    'className="uppercase tracking-wider">Warning: Data Mass Exceeds Viewport Buffer. Editing Suspended.</span>',
    'className={isDarkMode ? "uppercase tracking-wider" : ""}>{isDarkMode ? "Warning: Data Mass Exceeds Viewport Buffer. Editing Suspended." : "File is very large. Preview is truncated and editing is disabled to maintain performance."}</span>'
  ],
  [
    'className={`w-full flex-1 p-4 resize-none outline-none font-mono text-sm leading-relaxed min-h-0 shadow-[inset_0_0_30px_rgba(0,0,0,1)] transition-colors ${isEditable && !isHuge ? \'text-red-400 bg-[#050505] focus:ring-1 focus:ring-inset focus:ring-blood/50 selection:bg-blood/50\' : \'text-red-900/60 bg-[#0a0a0a] cursor-not-allowed selection:bg-red-900/20\'}`}',
    'className={`w-full flex-1 p-4 resize-none outline-none font-mono min-h-0 transition-colors ${isDarkMode ? "text-sm leading-relaxed shadow-[inset_0_0_30px_rgba(0,0,0,1)] " + (isEditable && !isHuge ? "text-red-400 bg-[#050505] focus:ring-1 focus:ring-inset focus:ring-blood/50 selection:bg-blood/50" : "text-red-900/60 bg-[#0a0a0a] cursor-not-allowed selection:bg-red-900/20") : "text-xs " + (isEditable && !isHuge ? "text-gray-800 bg-white" : "text-gray-600 bg-gray-50/50")}`}'
  ],
  [
    'className="flex-1 bg-[#0a0a0a] rounded-none border border-blood/30 flex flex-col items-center justify-center text-red-900/40 p-6 text-center shadow-[inset_0_0_50px_rgba(0,0,0,1)] relative overflow-hidden"',
    'className={`flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden ${isDarkMode ? "bg-[#0a0a0a] rounded-none border border-blood/30 text-red-900/40 shadow-[inset_0_0_50px_rgba(0,0,0,1)]" : "bg-white rounded-xl border border-gray-200 text-gray-400 shadow-sm"}`}'
  ],
  [
    'className="w-20 h-20 mb-4 text-red-900/10 drop-shadow-[0_0_5px_rgba(255,0,0,0.2)]"',
    'className={`mb-4 ${isDarkMode ? "w-20 h-20 text-red-900/10 drop-shadow-[0_0_5px_rgba(255,0,0,0.2)]" : "w-16 h-16 text-gray-200"}`}'
  ],
  [
    'className="font-tech text-xl uppercase tracking-[0.3em] text-red-900/50">No Signal</p>',
    'className={isDarkMode ? "font-tech text-xl uppercase tracking-[0.3em] text-red-900/50" : ""}>{isDarkMode ? "No Signal" : "Select a file from the list to preview its content"}</p>'
  ],
  [
    '<div className="mt-4 flex gap-1 items-end h-4">',
    '{isDarkMode && <div className="mt-4 flex gap-1 items-end h-4">'
  ],
  [
    '<div className="w-1 bg-red-900/20 h-4 animate-ping" style={{ animationDelay: \'600ms\' }}></div>\n                </div>',
    '<div className="w-1 bg-red-900/20 h-4 animate-ping" style={{ animationDelay: \'600ms\' }}></div>\n                </div>}'
  ],
  [
    'selectedFile.status === \'processing\' ? \'Initiating handshake...\' : \'Awaiting data link...\'',
    'selectedFile.status === \'processing\' ? (isDarkMode ? \'Initiating handshake...\' : \'Translating...\') : (isDarkMode ? \'Awaiting data link...\' : \'Translated content will appear here...\')'
  ]
];

for (const [search, replace] of themeMap) {
  code = code.replace(search, replace);
}

// Add the Moon/Sun toggle icon to header imports
if (!code.includes('Moon')) {
  code = code.replace('Settings, Clock', 'Settings, Clock, Moon, Sun');
}

// Add the toggle button to the header
const headerSettingsButtonStr = `className={\`p-2 transition-colors flex items-center justify-center \${isDarkMode ? "rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20" : "rounded-full hover:bg-gray-100"}\`}\n            aria-label="Settings"\n          >\n            <Settings className={\`w-5 h-5 \${isDarkMode ? "text-red-500 hover:text-neon-red" : "text-gray-600 hover:text-gray-900"}\`} />\n          </button>\n        </div>`;

const newButtons = `className={\`p-2 transition-colors flex items-center justify-center \${isDarkMode ? "rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20" : "rounded-full hover:bg-gray-100"}\`}\n            aria-label="Settings"\n          >\n            <Settings className={\`w-5 h-5 \${isDarkMode ? "text-red-500 hover:text-neon-red" : "text-gray-600 hover:text-gray-900"}\`} />\n          </button>\n          <button\n            onClick={() => setIsDarkMode(!isDarkMode)}\n            className={\`p-2 transition-colors flex items-center justify-center \${isDarkMode ? "rounded-none border border-transparent hover:border-red-900 hover:bg-blood/20" : "rounded-full hover:bg-gray-100"}\`}\n            aria-label="Toggle Theme"\n          >\n            {isDarkMode ? <Sun className="w-5 h-5 text-red-500 hover:text-neon-red" /> : <Moon className="w-5 h-5 text-gray-600 hover:text-gray-900" />}\n          </button>\n        </div>`;

code = code.replace(headerSettingsButtonStr, newButtons);

// One small fix for missing absolute elements
code = code.replace(
  '<div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none z-10 pointer-events-none">SYS_FILE_NODES</div>',
  '{isDarkMode && <div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none z-10 pointer-events-none">SYS_FILE_NODES</div>}'
);
code = code.replace(
  '<div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none pointer-events-none">ROUTE_A_INPUT</div>',
  '{isDarkMode && <div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none pointer-events-none">ROUTE_A_INPUT</div>}'
);
code = code.replace(
  '<div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none pointer-events-none">SYS_TRANSLATION_OUT</div>',
  '{isDarkMode && <div className="absolute top-0 right-0 p-1 font-tech text-[10px] text-red-900/30 select-none pointer-events-none">SYS_TRANSLATION_OUT</div>}'
);
code = code.replace(
  '<div className="absolute inset-0 bg-[url(\'https://www.transparenttextures.com/patterns/black-scales.png\')] opacity-10 pointer-events-none"></div>',
  '{isDarkMode && <div className="absolute inset-0 bg-[url(\'https://www.transparenttextures.com/patterns/black-scales.png\')] opacity-10 pointer-events-none"></div>}'
);
code = code.replace(
  '<div className="absolute inset-0 bg-[url(\'https://www.transparenttextures.com/patterns/black-scales.png\')] opacity-20 pointer-events-none"></div>',
  '{isDarkMode && <div className="absolute inset-0 bg-[url(\'https://www.transparenttextures.com/patterns/black-scales.png\')] opacity-20 pointer-events-none"></div>}'
);


fs.writeFileSync('src/App.tsx', code);
console.log("Transformation Complete");
