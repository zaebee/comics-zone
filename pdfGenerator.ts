/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDFFromDOM = async (elementIds: string[]) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();

    for (let i = 0; i < elementIds.length; i++) {
        const id = elementIds[i];
        const element = document.getElementById(id);
        
        if (element) {
            // Wait for images inside to be fully loaded (just in case)
            // though usually we wait in App.tsx before calling this.
            
            try {
                const canvas = await html2canvas(element, {
                    scale: 2, // 2x scale for better resolution
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                
                // Calculate dimensions to fit PDF page while maintaining aspect ratio
                const imgProps = doc.getImageProperties(imgData);
                const pdfRatio = pdfWidth / pdfHeight;
                const imgRatio = imgProps.width / imgProps.height;
                
                let w = pdfWidth;
                let h = pdfWidth / imgRatio;
                
                if (h > pdfHeight) {
                    h = pdfHeight;
                    w = pdfHeight * imgRatio;
                }
                
                // Centering
                const x = (pdfWidth - w) / 2;
                const y = (pdfHeight - h) / 2;

                if (i > 0) doc.addPage();
                doc.addImage(imgData, 'JPEG', x, y, w, h);
                
            } catch (err) {
                console.error(`Error capturing panel ${id}:`, err);
            }
        }
    }
    
    doc.save('Infinite-Heroes-Issue.pdf');
};