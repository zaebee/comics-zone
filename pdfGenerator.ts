/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import jsPDF from 'jspdf';
import { ComicFace } from './types';

export const generatePDF = (comicFaces: ComicFace[]) => {
    const PAGE_WIDTH = 480;
    const PAGE_HEIGHT = 720;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [PAGE_WIDTH, PAGE_HEIGHT] });
    
    const pagesToPrint = comicFaces
        .filter(face => face.imageUrl && !face.isLoading)
        .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    pagesToPrint.forEach((face, index) => {
        if (index > 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
        
        if (face.imageUrl) {
            doc.addImage(face.imageUrl, 'JPEG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
        }
        
        // Render text overlay for Story pages into the PDF
        if (face.type === 'story' && face.narrative) {
             doc.setFont("courier", "bold");
             
             if (face.narrative.caption) {
                 doc.setFontSize(10);
                 doc.setFillColor(254, 240, 138); // Yellow-200
                 doc.rect(10, 10, PAGE_WIDTH - 60, 40, 'F');
                 doc.text(face.narrative.caption, 15, 25, { maxWidth: PAGE_WIDTH - 70 });
             }
             
             if (face.narrative.dialogue) {
                 doc.setFontSize(12);
                 doc.setFillColor(255, 255, 255);
                 doc.circle(PAGE_WIDTH - 100, PAGE_HEIGHT - 60, 50, 'F');
                 doc.text(face.narrative.dialogue, PAGE_WIDTH - 100, PAGE_HEIGHT - 60, { align: 'center', maxWidth: 80 });
             }
        }
    });
    
    doc.save('Infinite-Heroes-Issue.pdf');
};