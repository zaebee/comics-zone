

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import { MAX_STORY_PAGES, BACK_COVER_PAGE, TOTAL_PAGES, INITIAL_PAGES, BATCH_SIZE, DECISION_PAGES, GENRES, TONES, LANGUAGES, ComicFace, Beat, Persona, UiLanguage, SavedState, SharedStory, SharedBeat } from './types';
import { Setup } from './Setup';
import { Book } from './Book';
import { useApiKey } from './useApiKey';
import { ApiKeyDialog } from './ApiKeyDialog';
import { generateStoryBeat, generateCharacterImage, generatePanelImage } from './aiService';

// --- Constants ---
// Switched to 2.5 Flash series for broader API key compatibility and speed
const MODEL_TEXT_NAME = "gemini-2.5-flash";
const MODEL_IMAGE_GEN_NAME = "gemini-2.5-flash-image";
const SAVE_KEY = "infinite_heroes_save_v1";

const App: React.FC = () => {
  // --- API Key Hook ---
  const { apiKey, validateApiKey, setShowApiKeyDialog, showApiKeyDialog, handleApiKeyDialogContinue } = useApiKey();
  
  // --- UI Language State ---
  const [uiLang, setUiLang] = useState<UiLanguage>('en');

  // --- Shared Story State ---
  const [sharedStory, setSharedStory] = useState<SharedStory | null>(null);

  useEffect(() => {
      // Simple detection
      if (navigator.language.startsWith('ru')) {
          setUiLang('ru');
      }

      // Check for Shared Story URL Param
      const params = new URLSearchParams(window.location.search);
      const storyParam = params.get('story');
      if (storyParam) {
          try {
              const jsonStr = atob(storyParam);
              const data = JSON.parse(jsonStr) as SharedStory;
              if (data && data.b) {
                  setSharedStory(data);
                  // Lock controls to match story
                  setSelectedGenre(data.gen);
                  setSelectedLanguage(data.lang);
                  setStoryTone(data.t);
                  setCustomPremise(data.p);
                  // Clear local save if loading a shared link to avoid conflicts
                  localStorage.removeItem(SAVE_KEY);
              }
          } catch (e) {
              console.error("Failed to parse shared story", e);
          }
      }
  }, []);

  const [hero, setHeroState] = useState<Persona | null>(null);
  const [friend, setFriendState] = useState<Persona | null>(null);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].code);
  const [customPremise, setCustomPremise] = useState("");
  const [storyTone, setStoryTone] = useState(TONES[0]);
  const [richMode, setRichMode] = useState(true);
  
  const heroRef = useRef<Persona | null>(null);
  const friendRef = useRef<Persona | null>(null);

  const setHero = (p: Persona | null) => { setHeroState(p); heroRef.current = p; };
  const setFriend = (p: Persona | null) => { setFriendState(p); friendRef.current = p; };
  
  const [comicFaces, setComicFaces] = useState<ComicFace[]>([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  
  // --- Transition States ---
  const [showSetup, setShowSetup] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const generatingPages = useRef(new Set<number>());
  const historyRef = useRef<ComicFace[]>([]);

  // --- Auto-Save ---
  useEffect(() => {
    // Don't auto-save if we are in Shared Mode (User B shouldn't overwrite their own saves with a shared view)
    if (isStarted && comicFaces.length > 0 && !sharedStory) {
        try {
            const stateToSave: SavedState = {
                hero: heroRef.current,
                friend: friendRef.current,
                selectedGenre,
                selectedLanguage,
                customPremise,
                storyTone,
                richMode,
                comicFaces,
                currentSheetIndex,
                isStarted: true
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Failed to save progress to local storage", e);
        }
    }
  }, [comicFaces, currentSheetIndex, isStarted, selectedGenre, selectedLanguage, customPremise, storyTone, richMode, sharedStory]);

  const loadFromSave = () => {
      try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (!raw) return;
          const data = JSON.parse(raw) as SavedState;
          
          setHero(data.hero);
          setFriend(data.friend);
          setSelectedGenre(data.selectedGenre);
          setSelectedLanguage(data.selectedLanguage);
          setCustomPremise(data.customPremise);
          setStoryTone(data.storyTone);
          setRichMode(data.richMode);
          setComicFaces(data.comicFaces);
          setCurrentSheetIndex(data.currentSheetIndex);
          setIsStarted(true);
          
          // Sync Refs
          heroRef.current = data.hero;
          friendRef.current = data.friend;
          // Reconstruct historyRef from comicFaces
          historyRef.current = [...data.comicFaces];
          
          setShowSetup(false);
      } catch (e) {
          console.error("Failed to load save", e);
          alert("Could not load saved comic. Data might be corrupted.");
      }
  };

  // --- Helpers ---
  const handleAPIError = (e: any) => {
    console.error("API Error caught:", e);
    const msg = String(e);
    if (
      msg.includes('Requested entity was not found') || 
      msg.includes('API_KEY_INVALID') || 
      msg.toLowerCase().includes('permission denied') ||
      msg.includes('403')
    ) {
      setShowApiKeyDialog(true);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const updateFaceState = (id: string, updates: Partial<ComicFace>) => {
      setComicFaces(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
      const idx = historyRef.current.findIndex(f => f.id === id);
      if (idx !== -1) historyRef.current[idx] = { ...historyRef.current[idx], ...updates };
  };

  // --- SERIALIZATION FOR SHARING ---
  const getShareLink = () => {
      if (historyRef.current.length === 0) return "";
      
      const beats = historyRef.current
        .filter(f => f.type === 'story' && f.narrative)
        .map(f => ({
           c: f.narrative?.caption,
           d: f.narrative?.dialogue,
           s: f.narrative?.scene || "",
           fc: f.narrative?.focus_char || 'hero',
           ch: f.choices || [],
           rc: f.resolvedChoice
        } as SharedBeat));

      const payload: SharedStory = {
          gen: selectedGenre,
          lang: selectedLanguage,
          t: storyTone,
          p: customPremise,
          b: beats
      };

      try {
          const str = btoa(JSON.stringify(payload));
          return `${window.location.origin}${window.location.pathname}?story=${str}`;
      } catch (e) {
          console.error("Error creating share link", e);
          return "";
      }
  };

  const generateSinglePage = async (faceId: string, pageNum: number, type: ComicFace['type']) => {
      const isDecision = DECISION_PAGES.includes(pageNum);
      let beat: Beat = { scene: "", choices: [], focus_char: 'other' };
      let resolvedChoiceForShared: string | undefined = undefined;

      if (type === 'cover') {
           // Cover beat handled in image gen
      } else if (type === 'back_cover') {
           beat = { scene: "Thematic teaser image", choices: [], focus_char: 'other' };
      } else {
           // --- SHARED STORY MODE CHECK ---
           if (sharedStory && sharedStory.b[pageNum - 1]) {
               // Use pre-loaded beat from URL
               const sb = sharedStory.b[pageNum - 1];
               beat = {
                   caption: sb.c,
                   dialogue: sb.d,
                   scene: sb.s,
                   choices: sb.ch,
                   focus_char: sb.fc
               };
               resolvedChoiceForShared = sb.rc;
           } else {
               // --- NORMAL GENERATION MODE ---
               try {
                 beat = await generateStoryBeat(apiKey, {
                    history: historyRef.current,
                    pageNum,
                    isDecisionPage: isDecision,
                    selectedGenre,
                    selectedLanguage,
                    storyTone,
                    richMode,
                    customPremise,
                    hero: heroRef.current,
                    friend: friendRef.current,
                    modelName: MODEL_TEXT_NAME
                 });
               } catch (e) {
                 handleAPIError(e);
                 return;
               }
           }
      }

      // Generate Friend Image if needed (and not already existing)
      if (beat.focus_char === 'friend' && !friendRef.current && type === 'story') {
          try {
              const desc = selectedGenre === 'Custom' ? "A fitting sidekick for this story" : `Sidekick for ${selectedGenre} story.`;
              const base64 = await generateCharacterImage(apiKey, desc, MODEL_IMAGE_GEN_NAME);
              setFriend({ base64, desc, name: "The Sidekick" });
          } catch (e) { 
              console.warn("Friend generation failed, continuing without friend image.");
              beat.focus_char = 'other'; 
          }
      }

      updateFaceState(faceId, { 
          narrative: beat, 
          choices: beat.choices, 
          isDecisionPage: isDecision,
          resolvedChoice: resolvedChoiceForShared 
      });
      
      try {
          const url = await generatePanelImage(apiKey, {
              beat,
              type,
              hero: heroRef.current,
              friend: friendRef.current,
              selectedGenre,
              selectedLanguage,
              modelName: MODEL_IMAGE_GEN_NAME
          });
          updateFaceState(faceId, { imageUrl: url, isLoading: false });
      } catch (e) {
          handleAPIError(e);
          updateFaceState(faceId, { isLoading: false });
      }
  };

  const generateBatch = async (startPage: number, count: number) => {
      const pagesToGen: number[] = [];
      for (let i = 0; i < count; i++) {
          const p = startPage + i;
          if (p <= TOTAL_PAGES && !generatingPages.current.has(p)) {
              pagesToGen.push(p);
          }
      }
      
      if (pagesToGen.length === 0) return;
      pagesToGen.forEach(p => generatingPages.current.add(p));

      const newFaces: ComicFace[] = [];
      pagesToGen.forEach(pageNum => {
          const type = pageNum === BACK_COVER_PAGE ? 'back_cover' : 'story';
          newFaces.push({ id: `page-${pageNum}`, type, choices: [], isLoading: true, pageIndex: pageNum });
      });

      setComicFaces(prev => {
          const existing = new Set(prev.map(f => f.id));
          return [...prev, ...newFaces.filter(f => !existing.has(f.id))];
      });
      newFaces.forEach(f => { if (!historyRef.current.find(h => h.id === f.id)) historyRef.current.push(f); });

      try {
          // In Shared Mode, we can potentially generate faster since we don't wait for text
          // But we still want to stagger them slightly to not hit rate limits on image gen
          for (const pageNum of pagesToGen) {
               await generateSinglePage(`page-${pageNum}`, pageNum, pageNum === BACK_COVER_PAGE ? 'back_cover' : 'story');
               generatingPages.current.delete(pageNum);
          }
      } catch (e) {
          console.error("Batch generation error", e);
      } finally {
          pagesToGen.forEach(p => generatingPages.current.delete(p));
      }
  }

  const launchStory = async () => {
    // --- API KEY VALIDATION ---
    const hasKey = await validateApiKey();
    if (!hasKey) return; 
    
    if (!heroRef.current) return;
    if (selectedGenre === 'Custom' && !customPremise.trim() && !sharedStory) {
        alert("Please enter a custom story premise.");
        return;
    }
    
    // Ensure names exist
    if (!heroRef.current.name.trim()) setHero({ ...heroRef.current, name: "The Hero" });
    if (friendRef.current && !friendRef.current.name.trim()) setFriend({ ...friendRef.current, name: "The Sidekick" });

    // Clear previous save on new launch
    localStorage.removeItem(SAVE_KEY);

    setIsTransitioning(true);
    
    if (!sharedStory) {
        // Random tone only if new story
        let availableTones = TONES;
        if (selectedGenre === "Teen Drama / Slice of Life" || selectedGenre === "Lighthearted Comedy") {
            availableTones = TONES.filter(t => t.includes("CASUAL") || t.includes("WHOLESOME") || t.includes("QUIPPY"));
        } else if (selectedGenre === "Classic Horror") {
            availableTones = TONES.filter(t => t.includes("INNER-MONOLOGUE") || t.includes("OPERATIC"));
        }
        setStoryTone(availableTones[Math.floor(Math.random() * availableTones.length)]);
    }

    const coverFace: ComicFace = { id: 'cover', type: 'cover', choices: [], isLoading: true, pageIndex: 0 };
    setComicFaces([coverFace]);
    historyRef.current = [coverFace];
    generatingPages.current.add(0);

    generateSinglePage('cover', 0, 'cover').finally(() => generatingPages.current.delete(0));
    
    setTimeout(async () => {
        setIsStarted(true);
        setShowSetup(false);
        setIsTransitioning(false);
        await generateBatch(1, INITIAL_PAGES);
        generateBatch(3, 3);
    }, 1100);
  };

  const handleChoice = (pageIndex: number, choice: string) => {
      // 1. Immediate Visual Feedback
      updateFaceState(`page-${pageIndex}`, { selectedChoice: choice });

      // 2. Delay for 1 second
      setTimeout(() => {
          // 3. Commit the choice
          updateFaceState(`page-${pageIndex}`, { resolvedChoice: choice });
          
          const maxPage = Math.max(...historyRef.current.map(f => f.pageIndex || 0));
          if (maxPage + 1 <= TOTAL_PAGES) {
              generateBatch(maxPage + 1, BATCH_SIZE);
          }
      }, 1000);
  }

  const resetApp = () => {
      setIsStarted(false);
      setShowSetup(true);
      setComicFaces([]);
      setCurrentSheetIndex(0);
      historyRef.current = [];
      generatingPages.current.clear();
      
      // Clear URL param if it exists so we can start fresh
      if (sharedStory) {
          window.history.pushState({}, document.title, window.location.pathname);
          setSharedStory(null);
      }
      // Keep hero/friend for easy restart
  };

  const downloadPDF = () => {
    const PAGE_WIDTH = 480;
    const PAGE_HEIGHT = 720;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [PAGE_WIDTH, PAGE_HEIGHT] });
    const pagesToPrint = comicFaces.filter(face => face.imageUrl && !face.isLoading).sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0));

    pagesToPrint.forEach((face, index) => {
        if (index > 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
        if (face.imageUrl) doc.addImage(face.imageUrl, 'JPEG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
        
        if (face.type === 'story' && face.narrative) {
             doc.setFont("courier", "bold");
             if (face.narrative.caption) {
                 doc.setFontSize(10);
                 doc.setFillColor(254, 240, 138); 
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

  const handleHeroUpload = async (file: File) => {
       try { 
           const base64 = await fileToBase64(file); 
           // Preserve existing name if replacing image
           setHero({ base64, desc: "The Main Hero", name: heroRef.current?.name || "" }); 
        } catch (e) { alert("Hero upload failed"); }
  };
  const handleFriendUpload = async (file: File) => {
       try { 
           const base64 = await fileToBase64(file); 
           setFriend({ base64, desc: "The Sidekick/Rival", name: friendRef.current?.name || "" }); 
        } catch (e) { alert("Friend upload failed"); }
  };

  const handleHeroNameChange = (name: string) => {
      if (!heroRef.current) {
          setHero({ base64: "", desc: "The Main Hero", name });
      } else {
          setHero({ ...heroRef.current, name });
      }
  };

  const handleFriendNameChange = (name: string) => {
    if (!friendRef.current) {
        setFriend({ base64: "", desc: "The Sidekick", name });
    } else {
        setFriend({ ...friendRef.current, name });
    }
  };

  const handleSheetClick = (index: number) => {
      if (!isStarted) return;
      if (index === 0 && currentSheetIndex === 0) return;
      if (index < currentSheetIndex) setCurrentSheetIndex(index);
      else if (index === currentSheetIndex && comicFaces.find(f => f.pageIndex === index)?.imageUrl) setCurrentSheetIndex(prev => prev + 1);
  };

  return (
    <div className="comic-scene">
      {showApiKeyDialog && <ApiKeyDialog onContinue={handleApiKeyDialogContinue} uiLang={uiLang} setUiLang={setUiLang} />}
      
      <Setup 
          show={showSetup}
          isTransitioning={isTransitioning}
          uiLang={uiLang}
          setUiLang={setUiLang}
          hero={hero?.base64 ? hero : null} 
          friend={friend?.base64 ? friend : null}
          selectedGenre={selectedGenre}
          selectedLanguage={selectedLanguage}
          customPremise={customPremise}
          richMode={richMode}
          isSharedMode={!!sharedStory}
          onHeroUpload={handleHeroUpload}
          onFriendUpload={handleFriendUpload}
          onHeroNameChange={(name) => handleHeroNameChange(name)}
          onFriendNameChange={(name) => handleFriendNameChange(name)}
          onGenreChange={setSelectedGenre}
          onLanguageChange={setSelectedLanguage}
          onPremiseChange={setCustomPremise}
          onRichModeChange={setRichMode}
          onLaunch={launchStory}
          onLoadSave={loadFromSave}
      />
      
      <Book 
          comicFaces={comicFaces}
          currentSheetIndex={currentSheetIndex}
          isStarted={isStarted}
          isSetupVisible={showSetup && !isTransitioning}
          uiLang={uiLang}
          onSheetClick={handleSheetClick}
          onChoice={handleChoice}
          onOpenBook={() => setCurrentSheetIndex(1)}
          onDownload={downloadPDF}
          onReset={resetApp}
          onShare={getShareLink}
      />
    </div>
  );
};

export default App;