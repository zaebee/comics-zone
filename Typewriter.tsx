/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface TypewriterProps {
    text: string;
    delay?: number;
    speed?: number;
}

export const Typewriter: React.FC<TypewriterProps> = ({ text, delay = 0, speed = 20 }) => {
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
            }, speed); 
        }, delay);
        
        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, [text, delay, speed]);
    
    return <>{currentText}</>;
};