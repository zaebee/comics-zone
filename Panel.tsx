/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ComicFace, INITIAL_PAGES, GATE_PAGE } from './types';
import { LoadingFX } from './LoadingFX';

interface PanelProps {
    face?: ComicFace;
    allFaces: ComicFace[]; // Needed for cover "printing" status
    onChoice: (pageIndex: number, choice: string) => void;
    onOpenBook: () => void;
    onDownload: () => void;
    onReset: () => void;
}

export const Panel: React.FC<PanelProps> = ({ face, allFaces, onChoice, onOpenBook, onDownload, onReset }) => {
    if (!face) return <div className="w-full h-full bg-gray-950" />;
    if (face.isLoading && !face.imageUrl) return <LoadingFX />;
    
    const isFullBleed = face.type === 'cover' || face.type === 'back_cover';

    return (
        <div className={`panel-container relative group ${isFullBleed ? '!p-0 !bg-[#0a0a0a]' : ''}`}>
            <div className="gloss"></div>
            {face.imageUrl && <img src={face.imageUrl} alt="Comic panel" className={`panel-image ${isFullBleed ? '!object-cover' : ''}`} />}
            
            {/* --- HTML TEXT OVERLAYS --- */}
            {/* This fixes issues with AI generating "crooked" or illegible text for non-Latin languages */}
            {face.type === 'story' && face.narrative && !face.isLoading && (
               <>
                  {/* Narrative Caption: Top Left */}
                  {face.narrative.caption && (
                      <div className="absolute top-3 left-3 right-12 z-10 pointer-events-none">
                          <div className="bg-yellow-200 border-2 border-black p-2 shadow-[3px_3px_0px_rgba(0,0,0,0.5)] inline-block max-w-full">
                              <p className="font-comic text-black text-sm md:text-base leading-tight">
                                  {face.narrative.caption}
                              </p>
                          </div>
                      </div>
                  )}

                  {/* Speech Bubble: Bottom Right (or positioned to avoid caption) */}
                  {face.narrative.dialogue && (
                      <div className="absolute bottom-16 right-3 max-w-[85%] z-10 pointer-events-none flex justify-end">
                           <div className="relative bg-white border-2 border-black rounded-[20px] rounded-br-none p-3 shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
                               <p className="font-comic text-black text-lg md:text-xl leading-snug">
                                   {face.narrative.dialogue}
                               </p>
                               {/* Little tail for the bubble */}
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
                    <p className="text-white font-comic text-2xl uppercase tracking-widest animate-pulse">What drives you?</p>
                    {face.choices.map((choice, i) => (
                        <button key={i} onClick={(e) => { e.stopPropagation(); if(face.pageIndex) onChoice(face.pageIndex, choice); }}
                          className={`comic-btn w-full py-3 text-xl font-bold tracking-wider ${i===0?'bg-yellow-400 hover:bg-yellow-300':'bg-blue-500 text-white hover:bg-blue-400'}`}>
                            {choice}
                        </button>
                    ))}
                </div>
            )}

            {/* Cover Action */}
            {face.type === 'cover' && (
                 <div className="absolute bottom-20 inset-x-0 flex justify-center z-20">
                     <button onClick={(e) => { e.stopPropagation(); onOpenBook(); }}
                      disabled={!allFaces.find(f => f.pageIndex === GATE_PAGE)?.imageUrl}
                      className="comic-btn bg-yellow-400 px-10 py-4 text-3xl font-bold hover:scale-105 animate-bounce disabled:animate-none disabled:bg-gray-400 disabled:cursor-wait">
                         {(!allFaces.find(f => f.pageIndex === GATE_PAGE)?.imageUrl) ? `PRINTING... ${allFaces.filter(f => f.type==='story' && f.imageUrl && (f.pageIndex||0) <= GATE_PAGE).length}/${INITIAL_PAGES}` : 'READ ISSUE #1'}
                     </button>
                 </div>
            )}

            {/* Back Cover Actions */}
            {face.type === 'back_cover' && (
                <div className="absolute bottom-24 inset-x-0 flex flex-col items-center gap-4 z-20">
                    <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="comic-btn bg-blue-500 text-white px-8 py-3 text-xl font-bold hover:scale-105">DOWNLOAD ISSUE</button>
                    <button onClick={(e) => { e.stopPropagation(); onReset(); }} className="comic-btn bg-green-500 text-white px-8 py-4 text-2xl font-bold hover:scale-105">CREATE NEW ISSUE</button>
                </div>
            )}
        </div>
    );
}