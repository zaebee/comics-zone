
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ComicFace, TOTAL_PAGES, UiLanguage, SeriesProgress } from './types';
import { Panel } from './Panel';

interface BookProps {
    comicFaces: ComicFace[];
    currentSheetIndex: number;
    isStarted: boolean;
    isSetupVisible: boolean;
    uiLang: UiLanguage;
    seriesProgress?: SeriesProgress | null; // NEW
    onSheetClick: (index: number) => void;
    onChoice: (pageIndex: number, choice: string) => void;
    onOpenBook: () => void;
    onDownload: () => void;
    onReset: () => void;
    onShare: () => string;
    onNextIssue: () => void; // NEW
    isGeneratingNextIssue: boolean; // NEW
}

export const Book: React.FC<BookProps> = (props) => {
    const sheetsToRender = [];
    if (props.comicFaces.length > 0) {
        sheetsToRender.push({ front: props.comicFaces[0], back: props.comicFaces.find(f => f.pageIndex === 1) });
        for (let i = 2; i <= TOTAL_PAGES; i += 2) {
            sheetsToRender.push({ front: props.comicFaces.find(f => f.pageIndex === i), back: props.comicFaces.find(f => f.pageIndex === i + 1) });
        }
    } else if (props.isSetupVisible) {
        // Placeholder sheet for initial render behind setup
        sheetsToRender.push({ front: undefined, back: undefined });
    }

    const panelProps = {
        allFaces: props.comicFaces,
        uiLang: props.uiLang,
        seriesProgress: props.seriesProgress,
        onChoice: props.onChoice,
        onOpenBook: props.onOpenBook,
        onDownload: props.onDownload,
        onReset: props.onReset,
        onShare: props.onShare,
        onNextIssue: props.onNextIssue,
        isGeneratingNextIssue: props.isGeneratingNextIssue
    };

    return (
        <div className={`book ${props.currentSheetIndex > 0 ? 'opened' : ''} transition-all duration-1000 ease-in-out`}
           style={ (props.isSetupVisible) ? { transform: 'translateZ(-600px) translateY(-100px) rotateX(20deg) scale(0.9)', filter: 'blur(6px) brightness(0.7)', pointerEvents: 'none' } : {}}>
          {sheetsToRender.map((sheet, i) => (
              <div key={i} className={`paper ${i < props.currentSheetIndex ? 'flipped' : ''}`} style={{ zIndex: i < props.currentSheetIndex ? i : sheetsToRender.length - i }}
                   onClick={() => props.onSheetClick(i)}>
                  <div className="front">
                      <Panel face={sheet.front} {...panelProps} />
                  </div>
                  <div className="back">
                      <Panel face={sheet.back} {...panelProps} />
                  </div>
              </div>
          ))}
      </div>
    );
}
