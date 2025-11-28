/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Beat, ComicFace, Persona, LANGUAGES, MAX_STORY_PAGES, Villain, SeriesProgress } from './types';

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
      description: "Visual description for the artist. MUST mention 'HERO' or 'CO-STAR' or 'VILLAIN' if present." 
    },
    focus_char: { 
      type: Type.STRING, 
      enum: ["hero", "friend", "villain", "other"],
      description: "Which character is the main focus of this panel."
    },
    choices: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Two distinct, concrete action options for the user that directly address the immediate scene conflict. (Only for decision pages)."
    }
  },
  required: ["caption", "scene", "focus_char", "choices"]
};

const VILLAIN_SCHEMA: Schema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        desc: { type: Type.STRING, description: "Physical description for image generation. Focus on face, armor/clothing, and vibe." },
        origin: { type: Type.STRING, description: "Short backstory based on previous events." },
        injuries: { type: Type.STRING, description: "Visual evolution: scars, cybernetics, or mutations gained from previous defeat. Empty if new." }
    },
    required: ["name", "desc", "origin"]
};

// --- CAMPBELL / PROPP NARRATIVE CIRCLE ---
const STORY_CIRCLE: Record<number, { campbell: string, propp: string, instruction: string }> = {
    1: {
        campbell: "Ordinary World / Status Quo",
        propp: "Initial Situation",
        instruction: "Establish the [HERO]'s current situation. If this is a sequel, show how the previous adventure changed them. Establish a mood."
    },
    2: {
        campbell: "Call to Adventure",
        propp: "Villainy / Mediation",
        instruction: "INCITING INCIDENT. The antagonist [VILLAIN] reveals themselves or their plan. A threat disrupts the peace."
    },
    3: {
        campbell: "Refusal / Crossing the Threshold",
        propp: "Decision to Counteract / Departure",
        instruction: "DECISION POINT. [HERO] must choose how to react to the [VILLAIN]'s threat. Define the stakes."
    },
    4: {
        campbell: "Tests, Allies, Enemies",
        propp: "First Function of Donor / Acquisition of Agent",
        instruction: "Enter the Special World. [HERO] meets an ally (or Co-Star) or finds a tool/clue. The stakes become real. Show interaction."
    },
    5: {
        campbell: "Approach to the Inmost Cave",
        propp: "Guidance / Spatial Transference",
        instruction: "Tension rises. [HERO] gets closer to the source of the problem. A plan is formed. Show preparation or stealth."
    },
    6: {
        campbell: "The Ordeal (Midpoint)",
        propp: "Struggle",
        instruction: "Direct confrontation. Everything goes wrong. [HERO] faces [VILLAIN] or their minions. Major setback or physical danger."
    },
    7: {
        campbell: "The Reward (Seizing the Sword)",
        propp: "Victory / Branding",
        instruction: "[HERO] survives the ordeal and gains insight, a key item, or a small victory. But the danger isn't over."
    },
    8: {
        campbell: "The Road Back",
        propp: "Pursuit",
        instruction: "The consequences of the Ordeal. The antagonist pushes back hard. A chase or ticking clock begins. Fast pace."
    },
    9: {
        campbell: "Resurrection",
        propp: "Transfiguration / Difficult Task",
        instruction: "The final test. [HERO] must use what they learned to overcome the ultimate challenge against [VILLAIN]."
    },
    10: {
        campbell: "Return with the Elixir",
        propp: "Wedding / Status Quo Restored",
        instruction: "Resolution. [HERO] wins (or survives). The [VILLAIN] is defeated (but maybe escapes). CLIFFHANGER allowed for the next issue."
    }
};


// --- CLIENT HELPER ---
const getClient = (apiKey: string) => new GoogleGenAI({ apiKey });

// Helper to strip markdown code blocks if present
const cleanJson = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
  }
  return cleaned;
};

// --- API FUNCTIONS ---

export const generateIssueSummary = async (apiKey: string, history: ComicFace[], heroName: string): Promise<string> => {
    const ai = getClient(apiKey);
    const textContext = history
        .filter(f => f.type === 'story' && f.narrative)
        .map(f => `${f.narrative?.caption} ${f.narrative?.dialogue}`)
        .join(" ");

    const prompt = `
    Summarize the following comic book story in 3 sentences. Focus on the main conflict, how ${heroName} resolved it, and the status of the antagonist at the end.
    STORY: ${textContext}
    `;

    try {
        const res = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        return res.text || "The hero fought a great battle and survived.";
    } catch (e) {
        return "The adventure concluded successfully.";
    }
};

export const generateVillain = async (apiKey: string, summary: string, previousVillain: Villain | null): Promise<Villain> => {
    const ai = getClient(apiKey);
    const prompt = previousVillain 
        ? `
          The previous villain, ${previousVillain.name}, was involved in this story: "${summary}".
          They are returning for the sequel. 
          Generate a valid JSON object describing their EVOLUTION.
          How have they changed physically? (Scars, cybernetics, spectral form, better armor).
          Update 'injuries' with these visual changes.
          Update 'desc' to include these changes.
          Set status to 'returning'.
          `
        : `
          Analyze this story summary: "${summary}".
          Identify the antagonist (or invent one that fits the loose ends).
          Generate a valid JSON object for a NEW VILLAIN.
          Give them a cool name, a visual description (desc), and an origin.
          Set injuries to empty string.
          Set status to 'active'.
          `;

    const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: VILLAIN_SCHEMA }
    });
    
    const data = JSON.parse(cleanJson(res.text || "{}"));
    
    // Generate Image for Villain
    const imageRes = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
            parts: [
                { text: `Comic book character sheet. Villain. Name: ${data.name}. Description: ${data.desc}. ${data.injuries ? `Visual Features: ${data.injuries}` : ''} Full body, neutral background. Ensure strong character design.` },
                // If previous villain exists, we could pass their image to maintain likeness, 
                // but for "evolution" sometimes fresh generation with strong prompt is better to avoid artifacts.
                // Let's rely on text description for now for flexibility.
            ]
        },
        config: { imageConfig: { aspectRatio: '1:1' } }
    });
    
    const base64 = imageRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || "";

    return {
        name: data.name,
        desc: data.desc,
        origin: data.origin,
        status: data.status,
        injuries: data.injuries,
        base64: base64
    };
};

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
        seriesProgress?: SeriesProgress | null; // NEW
    }
): Promise<Beat> => {
    const { history, pageNum, isDecisionPage, selectedGenre, selectedLanguage, storyTone, richMode, customPremise, hero, friend, modelName, seriesProgress } = params;
    const ai = getClient(apiKey);
    
    const isFinalPage = pageNum === MAX_STORY_PAGES;
    const langName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";

    // Names
    const heroName = hero?.name || "The Hero";
    const friendName = friend?.name || "The Sidekick";
    const villainName = seriesProgress?.villain?.name || "The Villain";

    // Filter relevant history
    const relevantHistory = history
        .filter(p => p.type === 'story' && p.narrative && (p.pageIndex || 0) < pageNum)
        .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    const historyText = relevantHistory.map(p => 
      `[Page ${p.pageIndex}] [Focus: ${p.narrative?.focus_char}] (Caption: "${p.narrative?.caption || ''}") (Dialogue: "${p.narrative?.dialogue || ''}") (Scene: ${p.narrative?.scene}) ${p.resolvedChoice ? `-> USER CHOICE: "${p.resolvedChoice}"` : ''}`
    ).join('\n');

    // Logic: Series Context
    let seriesContext = "";
    if (seriesProgress) {
        seriesContext = `
        ISSUE #${seriesProgress.issueNumber}.
        PREVIOUSLY: ${seriesProgress.prevSummary}.
        MAIN ANTAGONIST: ${villainName} (${seriesProgress.villain?.desc}).
        NOTE: Ensure ${villainName} is mentioned or appears as the threat.
        `;
    }

    // Logic: Story Driver
    let coreDriver = `GENRE: ${selectedGenre}.`;
    if (selectedGenre === 'Custom') {
        coreDriver = `STORY PREMISE: ${customPremise || "A totally unique, unpredictable adventure"}.`;
    }

    // Logic: Tone
    let toneInstruction = `TONE: ${storyTone}.`;
    if (storyTone.includes("ACTION-HEAVY")) {
        toneInstruction += " INSTRUCTION: Prioritize kinetics. Short, punchy sentences.";
    } // ... (keep other tones same as before) ...

    // Logic: Structure Lookup
    const structure = STORY_CIRCLE[pageNum] || { campbell: "Unknown", propp: "Unknown", instruction: "Continue the story." };
    let instruction = `PHASE: ${structure.campbell}. PROPP FUNCTION: ${structure.propp}. INSTRUCTION: ${structure.instruction.replace('[HERO]', heroName).replace('[VILLAIN]', villainName)}`;

    // Logic: Characters
    let charContext = `Name: ${friendName}. Status: Not yet introduced.`;
    if (friend) {
        charContext = `Name: ${friendName}. Status: ACTIVE.`;
    }

    const guardrails = `
    NEGATIVE CONSTRAINTS:
    1. NEVER write "To be continued" in the caption unless it is Page 10.
    2. NEVER leave caption/dialogue empty if the scene implies speaking.
    3. Use names "${heroName}", "${friendName}", "${villainName}". 
    4. For 'scene', use tokens 'HERO', 'CO-STAR', 'VILLAIN'.
       Example: "HERO punches VILLAIN in the face."
    `;

    if (richMode) instruction += " RICH MODE: Prioritize deeper thoughts and emotional nuance.";

    if (isFinalPage) {
        instruction += " FINAL PAGE. Text must end with 'TO BE CONTINUED...'.";
    } else if (isDecisionPage) {
        instruction += " CRITICAL: BRANCHING POINT. The `scene` must describe an immediate conflict. The `choices` MUST be two specific, conflicting actions.";
    }

    const systemInstruction = `You are a legendary comic book writer. You excel at visual storytelling.`;

    const prompt = `
    You are writing a comic book script. PAGE ${pageNum} of ${MAX_STORY_PAGES}.
    TARGET LANGUAGE: ${langName}.
    
    SERIES CONTEXT: ${seriesContext}

    CHARACTERS:
    - HERO: ${heroName}
    - CO-STAR: ${charContext}
    - VILLAIN: ${villainName}

    PREVIOUS PANELS:
    ${historyText.length > 0 ? historyText : "PAGE 1 START. Establish the world."}

    NARRATIVE GOAL: ${instruction}
    
    ${coreDriver} 
    ${toneInstruction}
    ${guardrails}
    
    Generate the next panel beat in strictly VALID JSON format matching the schema.
    `;

    try {
        const res = await ai.models.generateContent({ 
            model: modelName, 
            contents: prompt, 
            config: { 
                responseMimeType: 'application/json',
                responseSchema: BEAT_SCHEMA,
                systemInstruction: systemInstruction
            } 
        });
        
        let rawText = cleanJson(res.text || "{}");
        const parsed = JSON.parse(rawText) as Beat;

        if (!parsed.choices) parsed.choices = [];
        if (isDecisionPage && !isFinalPage && parsed.choices.length < 2) parsed.choices = ["Option A", "Option B"];
        if (!['hero', 'friend', 'villain', 'other'].includes(parsed.focus_char)) parsed.focus_char = 'hero';
        
        return parsed;
    } catch (e) {
        console.error("Beat generation failed", e);
        return { 
            caption: "Visual feed interrupted...", 
            scene: `A static-filled scene with the silhouette of ${heroName}.`, 
            focus_char: 'hero', 
            choices: [] 
        };
    }
};

export const generateCharacterImage = async (apiKey: string, description: string, modelName: string): Promise<string> => {
    const ai = getClient(apiKey);
    const prompt = `Character design sheet. Full body. Neutral background. High quality, detailed comic book style. Description: ${description}. Ensure facial symmetry and distinct features.`;

    try {
        const res = await ai.models.generateContent({
            model: modelName,
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: '1:1' } }
        });

        const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        return part?.inlineData?.data || "";
    } catch (e) {
        console.error("Character generation failed", e);
        throw e;
    }
};

export const generatePanelImage = async (
    apiKey: string,
    params: {
        beat: Beat;
        type: ComicFace['type'];
        hero?: Persona | null;
        friend?: Persona | null;
        villain?: Villain | null; // NEW
        selectedGenre: string;
        selectedArtStyle: string;
        selectedLanguage: string;
        modelName: string;
        seriesProgress?: SeriesProgress | null; // NEW
    }
): Promise<string> => {
    const { beat, type, hero, friend, villain, selectedGenre, selectedArtStyle, selectedLanguage, modelName, seriesProgress } = params;
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
    if (villain?.base64) {
        contents.push({ text: "REFERENCE 3 [VILLAIN]:" });
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: villain.base64 } });
    }

    let styleEra = selectedGenre === 'Custom' ? "Modern American" : selectedGenre;
    let visualMedium = `comic book art (${styleEra})`;
    if (selectedArtStyle && !selectedArtStyle.includes("Standard")) {
        visualMedium = `${selectedArtStyle}`;
    }

    let promptText = `STYLE: ${visualMedium}. High quality, detailed. `;
    const likenessInstructions = `INSTRUCTIONS: Maintain strict character likeness. Ensure facial symmetry matches reference. Preserve the unique clothing style. Match the established body type.`;

    const issueInfo = seriesProgress ? `ISSUE #${seriesProgress.issueNumber}` : "ISSUE #1";

    if (type === 'cover') {
        const langName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English";
        promptText += `TYPE: Comic Book Cover. TITLE: "INFINITE HEROES ${issueInfo}" (OR LOCALIZED IN ${langName.toUpperCase()}). `;
        
        if (seriesProgress?.villain) {
            promptText += `Main visual: ${hero?.name} clashing with ${seriesProgress.villain.name}. `;
            promptText += `Villain features: ${seriesProgress.villain.injuries || seriesProgress.villain.desc}. `;
            promptText += `Use REFERENCE 1 for Hero, REFERENCE 3 for Villain. `;
        } else {
            promptText += `Main visual: Dynamic action shot of [HERO] (Use REFERENCE 1). `;
        }
        
        promptText += `${likenessInstructions}`;
    } else if (type === 'back_cover') {
        promptText += `TYPE: Comic Back Cover. FULL PAGE VERTICAL ART. Dramatic teaser. Text: "NEXT ISSUE SOON".`;
    } else {
        promptText += `TYPE: Vertical comic panel. SCENE: ${beat.scene}. `;
        promptText += `${likenessInstructions} `;
        promptText += `If scene mentions 'HERO' or '${hero?.name}', use REFERENCE 1. `;
        promptText += `If scene mentions 'CO-STAR' or '${friend?.name}', use REFERENCE 2. `;
        if (villain) {
            promptText += `If scene mentions 'VILLAIN' or '${villain.name}', use REFERENCE 3. Villain details: ${villain.injuries || villain.desc}. `;
        }
        promptText += `IMPORTANT: NO SPEECH BUBBLES. CLEAN ILLUSTRATION ONLY.`;
    }

    contents.push({ text: promptText });

    const res = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: { imageConfig: { aspectRatio: '3:4' } }
    });
    const part = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData?.data ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : '';
};