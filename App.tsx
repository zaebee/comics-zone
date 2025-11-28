/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import { MAX_STORY_PAGES, BACK_COVER_PAGE, TOTAL_PAGES, INITIAL_PAGES, BATCH_SIZE, DECISION_PAGES, GENRES, TONES, LANGUAGES, ComicFace, Beat, Persona, UiLanguage } from './types';
import { Setup } from './Setup';
import { Book } from './Book';
import { useApiKey } from './useApiKey';
import { ApiKeyDialog } from './ApiKeyDialog';
import { generateStoryBeat, generateCharacterImage, generatePanelImage } from './aiService';

// --- Constants ---
// Switched to 2.5 Flash series for broader API key compatibility and speed
const MODEL_TEXT_NAME = "gemini-2.5-flash";
const MODEL_IMAGE_GEN_NAME = "gemini-2.5-flash-image";

const App: React.FC = () => {
  // --- API Key Hook ---
  const { apiKey, validateApiKey, setShowApiKeyDialog, showApiKeyDialog, handleApiKeyDialogContinue } = useApiKey();
  
  // --- UI Language State ---
  const [uiLang, setUiLang] = useState<UiLanguage>('en');

  useEffect(() => {
      // Simple detection
      if (navigator.language.startsWith('ru')) {
          setUiLang('ru');
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

  const generateSinglePage = async (faceId: string, pageNum: number, type: ComicFace['type']) => {
      const isDecision = DECISION_PAGES.includes(pageNum);
      let beat: Beat = { scene: "", choices: [], focus_char: 'other' };

      if (type === 'cover') {
           // Cover beat handled in image gen
      } else if (type === 'back_cover') {
           beat = { scene: "Thematic teaser image", choices: [], focus_char: 'other' };
      } else {
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

      // Generate Friend Image if needed
      if (beat.focus_char === 'friend' && !friendRef.current && type === 'story') {
          try {
              const desc = selectedGenre === 'Custom' ? "A fitting sidekick for this story" : `Sidekick for ${selectedGenre} story.`;
              const base64 = await generateCharacterImage(apiKey, desc, MODEL_IMAGE_GEN_NAME);
              // Auto-name generated friend if blank
              setFriend({ base64, desc, name: "The Sidekick" });
          } catch (e) { 
              // If friend gen fails, we downgrade focus to other, but don't stop the story
              console.warn("Friend generation failed, continuing without friend image.");
              beat.focus_char = 'other'; 
          }
      }

      updateFaceState(faceId, { narrative: beat, choices: beat.choices, isDecisionPage: isDecision });
      
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
          // Don't leave it loading forever
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
    if (selectedGenre === 'Custom' && !customPremise.trim()) {
        alert("Please enter a custom story premise.");
        return;
    }
    
    // Ensure names exist
    if (!heroRef.current.name.trim()) setHero({ ...heroRef.current, name: "The Hero" });
    if (friendRef.current && !friendRef.current.name.trim()) setFriend({ ...friendRef.current, name: "The Sidekick" });

    setIsTransitioning(true);
    
    let availableTones = TONES;
    if (selectedGenre === "Teen Drama / Slice of Life" || selectedGenre === "Lighthearted Comedy") {
        availableTones = TONES.filter(t => t.includes("CASUAL") || t.includes("WHOLESOME") || t.includes("QUIPPY"));
    } else if (selectedGenre === "Classic Horror") {
        availableTones = TONES.filter(t => t.includes("INNER-MONOLOGUE") || t.includes("OPERATIC"));
    }
    
    setStoryTone(availableTones[Math.floor(Math.random() * availableTones.length)]);

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

  const handleChoice = async (pageIndex: number, choice: string) => {
      updateFaceState(`page-${pageIndex}`, { resolvedChoice: choice });
      const maxPage = Math.max(...historyRef.current.map(f => f.pageIndex || 0));
      if (maxPage + 1 <= TOTAL_PAGES) {
          generateBatch(maxPage + 1, BATCH_SIZE);
      }
  }

  const resetApp = () => {
      setIsStarted(false);
      setShowSetup(true);
      setComicFaces([]);
      setCurrentSheetIndex(0);
      historyRef.current = [];
      generatingPages.current.clear();
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
      // Create temp hero object if name typed before upload, or update existing
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
          hero={hero?.base64 ? hero : null} // Only pass if base64 exists (uploaded)
          friend={friend?.base64 ? friend : null}
          selectedGenre={selectedGenre}
          selectedLanguage={selectedLanguage}
          customPremise={customPremise}
          richMode={richMode}
          onHeroUpload={handleHeroUpload}
          onFriendUpload={handleFriendUpload}
          onHeroNameChange={(name) => handleHeroNameChange(name)}
          onFriendNameChange={(name) => handleFriendNameChange(name)}
          onGenreChange={setSelectedGenre}
          onLanguageChange={setSelectedLanguage}
          onPremiseChange={setCustomPremise}
          onRichModeChange={setRichMode}
          onLaunch={launchStory}
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
      />
    </div>
  );
};

export default App;