/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UiLanguage } from './types';
import { TRANSLATIONS } from './translations';

interface ApiKeyDialogProps {
  onContinue: (key: string) => void;
  uiLang: UiLanguage;
  setUiLang: (lang: UiLanguage) => void;
}

export const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ onContinue, uiLang, setUiLang }) => {
  const [inputKey, setInputKey] = useState('');
  const t = TRANSLATIONS[uiLang];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative max-w-lg w-full bg-white border-[6px] border-black shadow-[16px_16px_0px_rgba(0,0,0,1)] p-8 rotate-1 animate-in fade-in zoom-in duration-300">
        
        {/* Language Toggle */}
        <div className="absolute top-4 right-4 flex gap-2">
            <button 
                onClick={() => setUiLang('en')} 
                className={`font-comic text-sm px-2 py-1 border-2 border-black ${uiLang === 'en' ? 'bg-yellow-400' : 'bg-white text-gray-400'}`}
            >EN</button>
             <button 
                onClick={() => setUiLang('ru')} 
                className={`font-comic text-sm px-2 py-1 border-2 border-black ${uiLang === 'ru' ? 'bg-yellow-400' : 'bg-white text-gray-400'}`}
            >RU</button>
        </div>

        {/* Floating Icon Badge */}
        <div className="absolute -top-8 -left-8 w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] animate-bounce">
           <span className="text-5xl">🔑</span>
        </div>

        <h2 className="font-comic text-5xl text-blue-600 mb-4 uppercase tracking-wide leading-none" style={{textShadow: '2px 2px 0px black'}}>
          {t.apiKeyTitle}
        </h2>
        
        <p className="font-comic text-xl text-black mb-4 leading-relaxed">
          {t.apiKeySubtitle} <span className="font-bold bg-yellow-200 px-1 border border-black">API Key</span>.
        </p>

        <input 
            type="password" 
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder={t.apiKeyPlaceholder}
            className="w-full border-4 border-black font-comic text-xl p-3 mb-6 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all"
        />

        <div className="bg-gray-100 border-2 border-black border-dashed p-4 mb-6 text-left relative">
             <div className="absolute -top-3 left-4 bg-black text-white px-2 font-comic text-sm uppercase">{t.missionBriefing}</div>
             <p className="font-sans text-sm text-gray-800 leading-relaxed">
                {t.missionText}
                <br/>
                <span className="text-xs text-gray-500">Your key is stored locally in your browser.</span>
             </p>
        </div>

        <button 
          onClick={() => onContinue(inputKey)}
          disabled={!inputKey.trim()}
          className="comic-btn bg-blue-500 text-white text-2xl px-8 py-4 w-full hover:bg-blue-400 transition-transform active:scale-95 uppercase tracking-widest disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {t.enterKeyBtn}
        </button>
        
        <p className="text-center text-xs text-gray-400 mt-4 font-mono">{t.statusWaiting}</p>
      </div>
    </div>
  );
};