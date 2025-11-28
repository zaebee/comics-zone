
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useEffect } from 'react';
import { ComicFace, INITIAL_PAGES, GATE_PAGE, UiLanguage, SeriesProgress } from './types';
import { LoadingFX } from './LoadingFX';
import { TRANSLATIONS } from './translations';

interface PanelProps {
    face?: ComicFace;
    allFaces: ComicFace[]; 
    uiLang: UiLanguage;
    seriesProgress?: SeriesProgress | null; // NEW
    onChoice: (pageIndex: number, choice: string) => void;
    onOpenBook: () => void;
    onDownload: () => void;
    onReset: () => void;
    onShare?: () => string; 
    onNextIssue?: () => void; // NEW
    isGeneratingNextIssue?: boolean; // NEW
}

export const Panel: React.FC<PanelProps> = ({ face, allFaces, uiLang, seriesProgress, onChoice, onOpenBook, onDownload, onReset, onShare, onNextIssue, isGeneratingNextIssue }) => {
    const t = TRANSLATIONS[uiLang];
    const [linkCopied, setLinkCopied] = useState(false);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgError(false);
    }, [face?.imageUrl]);

    const animationClass = useMemo(() => {
        if (!face || face.type === 'cover' || face.type === 'back_cover') return '';
        const anims = [
            'animate-ken-burns-in', 
            'animate-ken-burns-out', 
            'animate-pan-right', 
            'animate-pan-left'
        ];
        return anims[Math.floor(Math.random() * anims.length)];
    }, [face?.id]);

    if (!face) return <div className="w-full h-full bg-gray-950" />;
    if (face.isLoading && !face.imageUrl) return <LoadingFX uiLang={uiLang} />;
    
    const isFullBleed = face.type === 'cover' || face.type === 'back_cover';
    const nextIssueNum = (seriesProgress?.issueNumber || 1) + 1;

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onShare) {
            const url = onShare();
            if (url) {
                navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            }
        }
    }

    return (
        <div className={`panel-container relative group overflow-hidden ${isFullBleed ? '!p-0 !bg-[#0a0a0a]' : ''}`}>
             <style>{`
                @keyframes kenBurnsIn { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }
                @keyframes kenBurnsOut { 0% { transform: scale(1.1); } 100% { transform: scale(1); } }
                @keyframes panRight { 0% { transform: translateX(0) scale(1.05); } 100% { transform: translateX(-2%) scale(1.05); } }
                @keyframes panLeft { 0% { transform: translateX(0) scale(1.05); } 100% { transform: translateX(2%) scale(1.05); } }
                
                @keyframes popIn { 
                    0% { transform: scale(0); opacity: 0; } 
                    60% { transform: scale(1.1); opacity: 1; } 
                    100% { transform: scale(1); opacity: 1; } 
                }
                @keyframes slideDownFade { 
                    0% { transform: translateY(-20px); opacity: 0; } 
                    100% { transform: translateY(0); opacity: 1; } 
                }

                .animate-ken-burns-in { animation: kenBurnsIn 15s ease-out forwards; }
                .animate-ken-burns-out { animation: kenBurnsOut 15s ease-out forwards; }
                .animate-pan-right { animation: panRight 15s ease-in-out alternate infinite; }
                .animate-pan-left { animation: panLeft 15s ease-in-out alternate infinite; }
                
                .animate-pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .animate-slide-down { animation: slideDownFade 0.8s ease-out forwards; }
            `}</style>

            <div className="gloss"></div>
            {face.imageUrl && !imgError ? (
                <img 
                    src={face.imageUrl} 
                    alt="Comic panel" 
                    className={`panel-image ${isFullBleed ? '!object-cover' : ''} ${animationClass}`} 
                    style={{ transformOrigin: 'center center', willChange: 'transform' }}
                    onError={() => setImgError(true)}
                />
            ) : face.imageUrl && imgError ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center border-[6px] border-red-600 m-1 z-20">
                    <div className="text-6xl mb-4 animate-pulse">⚡</div>
                    <h3 className="font-comic text-red-500 text-3xl font-bold uppercase tracking-widest mb-2" style={{textShadow: '2px 2px 0px black'}}>{t.imageErrorTitle}</h3>
                    <p className="font-comic text-white text-lg leading-tight opacity-90">{t.imageErrorMsg}</p>
                    {/* Decorative static pattern overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.05)_25%,rgba(255,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(255,0,0,0.05)_75%,rgba(255,0,0,0.05)_100%)] bg-[length:20px_20px] pointer-events-none"></div>
                 </div>
            ) : null}
            
            {/* --- HTML TEXT OVERLAYS --- */}
            {face.type === 'story' && face.narrative && !face.isLoading && (
               <>
                  {/* Narrative Caption */}
                  {face.narrative.caption && (
                      <div className="absolute top-3 left-3 right-12 z-10 pointer-events-none animate-slide-down" style={{animationDelay: '0.3s'}}>
                          <div className="bg-yellow-200 border-2 border-black p-2 shadow-[3px_3px_0px_rgba(0,0,0,0.5)] inline-block max-w-full transform rotate-[-1deg]">
                              <p className="font-comic text-black text-sm md:text-base leading-tight">
                                  {face.narrative.caption}
                              </p>
                          </div>
                      </div>
                  )}

                  {/* Speech Bubble */}
                  {face.narrative.dialogue && (
                      <div className="absolute bottom-16 right-3 max-w-[85%] z-10 pointer-events-none flex justify-end animate-pop-in" style={{animationDelay: '0.8s'}}>
                           <div className="relative bg-white border-2 border-black rounded-[20px] rounded-br-none p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] transform rotate-[1deg]">
                               <p className="font-comic text-black text-lg md:text-xl leading-snug">
                                   {face.narrative.dialogue}
                               </p>
                               <div className="absolute -bottom-[10px] right-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[0px] border-r-transparent border-t-[12px] border-t-black"></div>
                               <div className="absolute -bottom-[6px] right-[2px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[0px] border-r-transparent border-t-[9px] border-t-white"></div>
                           </div>
                      </div>
                  )}
               </>
            )}

            {/* Decision Buttons */}
            {face.isDecisionPage && face.choices.length > 0 && (
                <div className={`absolute bottom-0 inset-x-0 p-6 pb-12 flex flex-col gap-3 items-center justify-end transition-opacity duration-500 ${face.resolvedChoice ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20`}>
                    <p className={`text-white font-comic text-2xl uppercase tracking-widest ${face.selectedChoice ? 'opacity-0' : 'animate-pulse'}`}>{t.whatDrivesYou}</p>
                    {face.choices.map((choice, i) => {
                        const isSelected = face.selectedChoice === choice;
                        const isAnySelected = !!face.selectedChoice;
                        let stateClasses = "";
                        if (isAnySelected) {
                            if (isSelected) {
                                stateClasses = "bg-green-500 text-white scale-110 ring-4 ring-yellow-300 z-50 shadow-[0_0_20px_rgba(34,197,94,0.6)]";
                            } else {
                                stateClasses = "bg-gray-400 text-gray-200 scale-95 opacity-50 grayscale";
                            }
                        } else {
                            stateClasses = i === 0 
                                ? "bg-yellow-400 hover:bg-yellow-300" 
                                : "bg-blue-500 text-white hover:bg-blue-400";
                        }
                        return (
                            <button 
                                key={i} 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(face.pageIndex && !face.selectedChoice) onChoice(face.pageIndex, choice); 
                                }}
                                className={`comic-btn w-full py-3 text-xl font-bold tracking-wider transition-all duration-300 ${stateClasses}`}
                                style={{ animationDelay: `${1.5 + (i * 0.2)}s` }}
                            >
                                {choice}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Cover Action */}
            {face.type === 'cover' && (
                 <div className="absolute bottom-20 inset-x-0 flex justify-center z-20">
                     <button onClick={(e) => { e.stopPropagation(); onOpenBook(); }}
                      disabled={!allFaces.find(f => f.pageIndex === GATE_PAGE)?.imageUrl}
                      className="comic-btn bg-yellow-400 px-10 py-4 text-3xl font-bold hover:scale-105 animate-bounce disabled:animate-none disabled:bg-gray-400 disabled:cursor-wait">
                         {(!allFaces.find(f => f.pageIndex === GATE_PAGE)?.imageUrl) ? `${t.printing} ${allFaces.filter(f => f.type==='story' && f.imageUrl && (f.pageIndex||0) <= GATE_PAGE).length}/${INITIAL_PAGES}` : `${t.readIssue} ${seriesProgress ? '#' + seriesProgress.issueNumber : ''}`}
                     </button>
                 </div>
            )}

            {/* Back Cover Actions */}
            {face.type === 'back_cover' && (
                <div className="absolute bottom-24 inset-x-0 flex flex-col items-center gap-4 z-20 w-full px-8">
                    {onNextIssue && (
                         <button onClick={(e) => { e.stopPropagation(); onNextIssue(); }} disabled={isGeneratingNextIssue} className="comic-btn bg-red-600 text-white px-8 py-3 text-2xl font-bold hover:scale-105 w-full animate-pulse disabled:opacity-70 disabled:animate-none">
                             {isGeneratingNextIssue ? t.generatingNemesis : `${t.nextIssueBtn}${nextIssueNum}`}
                         </button>
                    )}
                    
                    {onShare && (
                        <button onClick={handleShare} className="comic-btn bg-purple-500 text-white px-8 py-3 text-xl font-bold hover:scale-105 w-full">
                            {linkCopied ? t.linkCopied : t.shareBtn}
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="comic-btn bg-blue-500 text-white px-8 py-3 text-xl font-bold hover:scale-105 w-full">{t.downloadIssue}</button>
                    <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="comic-btn bg-green-500 text-white px-8 py-4 text-xl font-bold hover:scale-105 w-full opacity-80">{t.createNew}</button>
                </div>
            )}
        </div>
    );
}
