
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
    seriesProgress?: SeriesProgress | null;
    onChoice: (pageIndex: number, choice: string) => void;
    onOpenBook: () => void;
    onDownload: () => void;
    onReset: () => void;
    onShare?: () => string; 
    onNextIssue?: () => void;
    isGeneratingNextIssue?: boolean;
}

const TypewriterText = ({ text, delay = 0 }: { text: string, delay?: number }) => {
    const [currentText, setCurrentText] = useState('');
    
    useEffect(() => {
        let timeoutId: any;
        let intervalId: any;
        
        setCurrentText('');
        
        timeoutId = setTimeout(() => {
            let i = 0;
            intervalId = setInterval(() => {
                setCurrentText(text.slice(0, i + 1));
                i++;
                if (i >= text.length) clearInterval(intervalId);
            }, 20); // Typing speed
        }, delay);
        
        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [text, delay]);
    
    return <>{currentText}</>;
};

export const Panel: React.FC<PanelProps> = ({ face, allFaces, uiLang, seriesProgress, onChoice, onOpenBook, onDownload, onReset, onShare, onNextIssue, isGeneratingNextIssue }) => {
    const t = TRANSLATIONS[uiLang];
    const [linkCopied, setLinkCopied] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [hideText, setHideText] = useState(false);
    
    // Parallax State
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate normalized position (-1 to 1)
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setMousePos({ x, y });
    };

    const handleMouseLeave = () => {
        setMousePos({ x: 0, y: 0 });
    };

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
        <div 
            className={`panel-container relative group overflow-hidden ${isFullBleed ? '!p-0 !bg-[#0a0a0a]' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
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
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }

                .animate-ken-burns-in { animation: kenBurnsIn 15s ease-out forwards; }
                .animate-ken-burns-out { animation: kenBurnsOut 15s ease-out forwards; }
                .animate-pan-right { animation: panRight 15s ease-in-out alternate infinite; }
                .animate-pan-left { animation: panLeft 15s ease-in-out alternate infinite; }
                
                .animate-pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .animate-slide-down { animation: slideDownFade 0.8s ease-out forwards; }
                .animate-float { animation: float 3s ease-in-out infinite; }
                
                .halftone-overlay {
                    background-image: radial-gradient(circle, #000 1px, transparent 1px);
                    background-size: 6px 6px;
                    opacity: 0.08;
                    pointer-events: none;
                }
                
                /* Custom scrollbar for caption box */
                .caption-scroll::-webkit-scrollbar { width: 4px; }
                .caption-scroll::-webkit-scrollbar-track { background: transparent; }
                .caption-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
            `}</style>

            <div className="gloss"></div>
            
            {/* --- IMAGE LAYER (Parallax Back) --- */}
            {face.imageUrl && !imgError ? (
                <div 
                    className="w-full h-full overflow-hidden" 
                    style={{ 
                        transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)`,
                        transition: 'transform 0.1s ease-out'
                    }}
                >
                    <img 
                        src={face.imageUrl} 
                        alt="Comic panel" 
                        className={`panel-image ${isFullBleed ? '!object-cover' : ''} ${animationClass}`} 
                        style={{ transformOrigin: 'center center', willChange: 'transform' }}
                        onError={() => setImgError(true)}
                    />
                    {/* Halftone Texture Overlay */}
                    <div className="absolute inset-0 halftone-overlay mix-blend-multiply"></div>
                </div>
            ) : face.imageUrl && imgError ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6 text-center border-[6px] border-red-600 m-1 z-20">
                    <div className="text-6xl mb-4 animate-pulse">⚡</div>
                    <h3 className="font-comic text-red-500 text-3xl font-bold uppercase tracking-widest mb-2" style={{textShadow: '2px 2px 0px black'}}>{t.imageErrorTitle}</h3>
                    <p className="font-comic text-white text-lg leading-tight opacity-90">{t.imageErrorMsg}</p>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.05)_25%,rgba(255,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(255,0,0,0.05)_75%,rgba(255,0,0,0.05)_100%)] bg-[length:20px_20px] pointer-events-none"></div>
                 </div>
            ) : null}
            
            {/* --- TEXT VISIBILITY TOGGLE --- */}
            {face.type === 'story' && face.imageUrl && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setHideText(!hideText); }}
                    className="absolute top-2 right-2 z-30 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-50 hover:opacity-100 transition-opacity"
                    title="Toggle Text"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      {hideText ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      )}
                    </svg>
                </button>
            )}

            {/* --- TEXT OVERLAY LAYER (Parallax Front) --- */}
            <div 
                className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 ${hideText ? 'opacity-0' : 'opacity-100'}`}
                style={{ 
                    transform: `translate(${mousePos.x * 5}px, ${mousePos.y * 5}px)`,
                    transition: 'transform 0.1s ease-out, opacity 0.3s ease'
                }}
            >
                {face.type === 'story' && face.narrative && !face.isLoading && (
                <>
                    {/* Narrative Caption */}
                    {face.narrative.caption && (
                        <div className="absolute top-0 left-0 right-0 p-3 animate-slide-down" style={{animationDelay: '0.3s'}}>
                            {/* Flex container to center or align text, avoiding full cover */}
                            <div className="flex justify-start">
                                <div className="bg-yellow-200 border-2 border-black p-2 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] max-w-[95%] transform rotate-[-0.5deg]">
                                    <div className="caption-scroll max-h-[120px] overflow-y-auto pr-1">
                                        <p className="font-comic text-black text-sm md:text-base leading-tight font-bold tracking-wide">
                                            <TypewriterText text={face.narrative.caption} delay={500} />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Speech Bubble */}
                    {face.narrative.dialogue && (
                        <div className="absolute bottom-16 right-3 max-w-[85%] flex justify-end animate-pop-in" style={{animationDelay: '0.8s'}}>
                            <div className="relative bg-white border-2 border-black rounded-[20px] rounded-br-none p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] transform rotate-[1deg] animate-float">
                                <p className="font-comic text-black text-lg md:text-xl leading-snug">
                                    <TypewriterText text={face.narrative.dialogue} delay={1000} />
                                </p>
                                <div className="absolute -bottom-[10px] right-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[0px] border-r-transparent border-t-[12px] border-t-black"></div>
                                <div className="absolute -bottom-[6px] right-[2px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[0px] border-r-transparent border-t-[9px] border-t-white"></div>
                            </div>
                        </div>
                    )}
                </>
                )}
            </div>

            {/* Decision Buttons (Static Z-Index layer) */}
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
