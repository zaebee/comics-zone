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

// --- CAMPBELL / PROPP NARRATIVE CIRCLE ---
// Maps page numbers to Hero's Journey (Campbell) and Propp Functions
const STORY_CIRCLE: Record<number, { campbell: string, propp: string, instruction: string }> = {
    1: {
        campbell: "Ordinary World",
        propp: "Initial Situation / Absentation",
        instruction: "Establish the status quo. Show [HERO] in their element, but establish a LACK or desire. What is missing in their life?"
    },
    2: {
        campbell: "Call to Adventure",
        propp: "Villainy / Mediation",
        instruction: "INCITING INCIDENT. An external event, villain, or message disrupts the Ordinary World. [HERO] is faced with a problem."
    },
    3: {
        campbell: "Refusal / Crossing the Threshold",
        propp: "Decision to Counteract / Departure",
        instruction: "DECISION POINT. [HERO] must choose how to react to the threat. They leave the comfort zone."
    },
    4: {
        campbell: "Tests, Allies, Enemies",
        propp: "First Function of Donor / Acquisition of Agent",
        instruction: "Enter the Special World. [HERO] meets an ally (or Co-Star) or finds a tool/clue. The stakes become real."
    },
    5: {
        campbell: "Approach to the Inmost Cave",
        propp: "Guidance / Spatial Transference",
        instruction: "Tension rises. [HERO] gets closer to the source of the problem. A plan is formed."
    },
    6: {
        campbell: "The Ordeal (Midpoint)",
        propp: "Struggle",
        instruction: "Direct confrontation. Everything goes wrong. [HERO] faces a major setback or physical danger."
    },
    7: {
        campbell: "The Reward (Seizing the Sword)",
        propp: "Victory / Branding",
        instruction: "[HERO] survives the ordeal and gains insight, a key item, or a small victory. But the danger isn't over."
    },
    8: {
        campbell: "The Road Back",
        propp: "Pursuit",
        instruction: "The consequences of the Ordeal. The antagonist pushes back hard. A chase or ticking clock begins."
    },
    9: {
        campbell: "Resurrection",
        propp: "Transfiguration / Difficult Task",
        instruction: "The final test. [HERO] must use what they learned to overcome the ultimate challenge. They are changed."
    },
    10: {
        campbell: "Return with the Elixir",
        propp: "Wedding / Status Quo Restored",
        instruction: "Resolution. [HERO] returns to a new normal, changed by the journey. CLIFFHANGER allowed."
    }
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

    // Names
    const heroName = hero?.name || "The Hero";
    const friendName = friend?.name || "The Sidekick";

    // Filter relevant history for context
    const relevantHistory = history
        .filter(p => p.type === 'story' && p.narrative && (p.pageIndex || 0) < pageNum)
        .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    const lastBeat = relevantHistory[relevantHistory.length - 1]?.narrative;
    const lastFocus = lastBeat?.focus_char || 'none';

    const historyText = relevantHistory.map(p => 
      `[Page ${p.pageIndex}] [Focus: ${p.narrative?.focus_char}] (Caption: "${p.narrative?.caption || ''}") (Dialogue: "${p.narrative?.dialogue || ''}") (Scene: ${p.narrative?.scene}) ${p.resolvedChoice ? `-> USER CHOICE: "${p.resolvedChoice}"` : ''}`
    ).join('\n');

    // Logic: Story Driver
    let coreDriver = `GENRE: ${selectedGenre}. TONE: ${storyTone}.`;
    if (selectedGenre === 'Custom') {
        coreDriver = `STORY PREMISE: ${customPremise || "A totally unique, unpredictable adventure"}.`;
    }

    // Logic: Structure Lookup
    const structure = STORY_CIRCLE[pageNum] || { campbell: "Unknown", propp: "Unknown", instruction: "Continue the story." };
    let instruction = `PHASE: ${structure.campbell}. PROPP FUNCTION: ${structure.propp}. INSTRUCTION: ${structure.instruction.replace('[HERO]', heroName)}`;

    // Logic: Co-Star Injection
    let friendInstruction = `Name: ${friendName}. Status: Not yet introduced.`;
    if (friend) {
        friendInstruction = `Name: ${friendName}. Status: ACTIVE and PRESENT.`;
        if (pageNum >= 4) {
             friendInstruction += " Ensure they are woven into the scene dynamics.";
        }
    }

    const guardrails = `
    NEGATIVE CONSTRAINTS:
    1. IF GENRE IS Teen Drama/Comedy: Stakes must be SOCIAL/EMOTIONAL, not life-or-death.
    2. IMPORTANT: Use the names "${heroName}" and "${friendName}" in the dialogue/captions. 
    3. HOWEVER, for the 'scene' field, you MUST use the tokens 'HERO' and 'CO-STAR' so the image generator knows who to draw.
       Example Scene: "HERO stands on a cliff while CO-STAR looks at a map."
       Example Dialogue: "${heroName}: Look at that view, ${friendName}!"
    `;

    if (richMode) instruction += " RICH MODE: Prioritize deeper thoughts and descriptive captions.";

    if (isFinalPage) {
        instruction += " FINAL PAGE. Text must end with 'TO BE CONTINUED...'.";
    } else if (isDecisionPage) {
        instruction += " End with a PSYCHOLOGICAL choice (Values/Risks), not just 'Go Left/Right'.";
    }

    const prompt = `
    You are writing a comic book script. PAGE ${pageNum} of ${MAX_STORY_PAGES}.
    TARGET LANGUAGE: ${langName}.
    
    CHARACTERS:
    - HERO NAME: ${heroName}
    - CO-STAR NAME: ${friendInstruction}

    PREVIOUS PANELS:
    ${historyText.length > 0 ? historyText : "Start the adventure."}

    NARRATIVE GOAL: ${instruction}
    
    ${coreDriver} 
    ${guardrails}
    
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
        // We instruct the model to look for the tokens 'HERO' and 'CO-STAR' in the beat.scene
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