
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Beat, ComicFace, Persona, LANGUAGES, MAX_STORY_PAGES } from './types';

// --- SCHEMA DEFINITIONS ---
const BEAT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    caption: { 
      type: Type.STRING, 
      description: "Narrator text or internal monologue. Keep concise." 
    },
    dialogue: { 
      type: Type.STRING, 
      description: "Character speech. Can be empty if no one speaks." 
    },
    scene: { 
      type: Type.STRING, 
      description: "Visual description for the artist. MUST mention 'HERO' or 'CO-STAR' if present." 
    },
    focus_char: { 
      type: Type.STRING, 
      enum: ["hero", "friend", "other"],
      description: "Which character is the main focus of this panel."
    },
    choices: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Two distinct options for the user (only for decision pages)."
    }
  },
  required: ["caption", "scene", "focus_char", "choices"]
};

// --- CLIENT HELPER ---
const getClient = (apiKey: string) => new GoogleGenAI({ apiKey });

// --- API FUNCTIONS ---

export const generateStoryBeat = async (
    apiKey: string,
    params: {
        history: ComicFace[];
        pageNum: number;
        isDecisionPage: boolean;
        selectedGenre: string;
        selectedLanguage: string;
        storyTone: string;
        richMode: boolean;
        customPremise: string;
        hero?: Persona | null;
        friend?: Persona | null;
        modelName: string;
    }
): Promise<Beat> => {
    const { history, pageNum, isDecisionPage, selectedGenre, selectedLanguage, storyTone, richMode, customPremise, hero, friend, modelName } = params;
    const ai = getClient(apiKey);
    
    const isFinalPage = pageNum === MAX_STORY_PAGES;
    const langName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";

    // Filter relevant history for context
    const relevantHistory = history
        .filter(p => p.type === 'story' && p.narrative && (p.pageIndex || 0) < pageNum)
        .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    const lastBeat = relevantHistory[relevantHistory.length - 1]?.narrative;
    const lastFocus = lastBeat?.focus_char || 'none';

    const historyText = relevantHistory.map(p => 
      `[Page ${p.pageIndex}] [Focus: ${p.narrative?.focus_char}] (Caption: "${p.narrative?.caption || ''}") (Dialogue: "${p.narrative?.dialogue || ''}") (Scene: ${p.narrative?.scene}) ${p.resolvedChoice ? `-> USER CHOICE: "${p.resolvedChoice}"` : ''}`
    ).join('\n');

    // Logic: Co-Star Injection
    let friendInstruction = "Not yet introduced.";
    if (friend) {
        friendInstruction = "ACTIVE and PRESENT (User Provided).";
        if (lastFocus !== 'friend' && Math.random() > 0.4) {
             friendInstruction += " MANDATORY: FOCUS ON THE CO-STAR FOR THIS PANEL.";
        } else {
             friendInstruction += " Ensure they are woven into the scene.";
        }
    }

    // Logic: Story Driver
    let coreDriver = `GENRE: ${selectedGenre}. TONE: ${storyTone}.`;
    if (selectedGenre === 'Custom') {
        coreDriver = `STORY PREMISE: ${customPremise || "A totally unique, unpredictable adventure"}.`;
    }

    // Logic: Guardrails
    const guardrails = `
    NEGATIVE CONSTRAINTS:
    1. UNLESS GENRE IS Sci-Fi/Superhero/Custom: DO NOT use technical jargon like "Quantum", "Timeline".
    2. IF GENRE IS Teen Drama/Comedy: Stakes must be SOCIAL/EMOTIONAL, not life-or-death.
    3. Avoid "The artifact" unless established.
    `;

    let instruction = `Continue the story. OUTPUT TEXT MUST BE IN ${langName.toUpperCase()}. ${coreDriver} ${guardrails}`;
    if (richMode) instruction += " RICH MODE: Prioritize deeper thoughts and descriptive captions.";

    if (isFinalPage) {
        instruction += " FINAL PAGE. KARMIC CLIFFHANGER. Reference the user's early choices. Text must end with 'TO BE CONTINUED...'.";
    } else if (isDecisionPage) {
        instruction += " End with a PSYCHOLOGICAL choice (Values/Risks), not just 'Go Left/Right'.";
    } else {
        if (pageNum === 1) instruction += " INCITING INCIDENT. Disrupt the status quo.";
        else if (pageNum <= 4) instruction += " RISING ACTION. Focus on character dynamics.";
        else if (pageNum <= 8) instruction += " COMPLICATION. A twist or blocked path.";
        else instruction += " CLIMAX. The main confrontation.";
    }

    const capLimit = richMode ? "max 35 words" : "max 15 words";
    const diaLimit = richMode ? "max 30 words" : "max 12 words";

    const prompt = `
    You are writing a comic book script. PAGE ${pageNum} of ${MAX_STORY_PAGES}.
    TARGET LANGUAGE: ${langName}.
    
    CHARACTERS:
    - HERO: Active.
    - CO-STAR: ${friendInstruction}

    PREVIOUS PANELS:
    ${historyText.length > 0 ? historyText : "Start the adventure."}

    INSTRUCTION: ${instruction}
    
    Generate the next panel beat.
    `;

    try {
        const res = await ai.models.generateContent({ 
            model: modelName, 
            contents: prompt, 
            config: { 
                responseMimeType: 'application/json',
                responseSchema: BEAT_SCHEMA 
            } 
        });
        
        const rawText = res.text;
        if (!rawText) throw new Error("No text returned from model");
        
        const parsed = JSON.parse(rawText) as Beat;

        // Post-processing defaults
        if (!parsed.choices) parsed.choices = [];
        if (isDecisionPage && !isFinalPage && parsed.choices.length < 2) parsed.choices = ["Option A", "Option B"];
        if (!['hero', 'friend', 'other'].includes(parsed.focus_char)) parsed.focus_char = 'hero';
        
        return parsed;
    } catch (e) {
        console.error("Beat generation failed", e);
        // Fallback beat
        return { 
            caption: "The story continues...", 
            scene: `Generic scene for page ${pageNum}.`, 
            focus_char: 'hero', 
            choices: [] 
        };
    }
};

export const generateCharacterImage = async (
    apiKey: string,
    description: string,
    modelName: string
): Promise<string> => {
    const ai = getClient(apiKey);
    // Removed try/catch to let errors bubble up
    const res = await ai.models.generateContent({
        model: modelName,
        contents: { text: `STYLE: Masterpiece comic book character sheet, detailed ink, neutral background. FULL BODY. Character: ${description}` },
        config: { imageConfig: { aspectRatio: '1:1' } }
    });
    const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) return part.inlineData.data;
    throw new Error("No image generated");
};

export const generatePanelImage = async (
    apiKey: string,
    params: {
        beat: Beat;
        type: ComicFace['type'];
        hero?: Persona | null;
        friend?: Persona | null;
        selectedGenre: string;
        selectedLanguage: string;
        modelName: string;
    }
): Promise<string> => {
    const { beat, type, hero, friend, selectedGenre, selectedLanguage, modelName } = params;
    const ai = getClient(apiKey);
    
    const contents = [];
    if (hero?.base64) {
        contents.push({ text: "REFERENCE 1 [HERO]:" });
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: hero.base64 } });
    }
    if (friend?.base64) {
        contents.push({ text: "REFERENCE 2 [CO-STAR]:" });
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: friend.base64 } });
    }

    const styleEra = selectedGenre === 'Custom' ? "Modern American" : selectedGenre;
    let promptText = `STYLE: ${styleEra} comic book art, detailed ink, vibrant colors. `;
    
    if (type === 'cover') {
        const langName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";
        promptText += `TYPE: Comic Book Cover. TITLE: "INFINITE HEROES" (OR LOCALIZED TRANSLATION IN ${langName.toUpperCase()}). Main visual: Dynamic action shot of [HERO] (Use REFERENCE 1).`;
    } else if (type === 'back_cover') {
        promptText += `TYPE: Comic Back Cover. FULL PAGE VERTICAL ART. Dramatic teaser. Text: "NEXT ISSUE SOON".`;
    } else {
        promptText += `TYPE: Vertical comic panel. SCENE: ${beat.scene}. `;
        promptText += `INSTRUCTIONS: Maintain strict character likeness. If scene mentions 'HERO', use REFERENCE 1. If scene mentions 'CO-STAR', use REFERENCE 2. `;
        promptText += `IMPORTANT: DO NOT DRAW SPEECH BUBBLES OR CAPTION BOXES. GENERATE A CLEAN ILLUSTRATION ONLY.`;
    }

    contents.push({ text: promptText });

    // Removed try/catch to let errors bubble up (e.g. 403 Permission Denied)
    const res = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: { imageConfig: { aspectRatio: '3:4' } }
    });
    const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData?.data ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : '';
};
