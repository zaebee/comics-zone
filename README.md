
# Infinite Heroes - Dynamic AI Comics

A fully interactive, AI-powered comic book generator that turns users into the heroes of their own stories. Built with React, Tailwind CSS, and the **Google Gemini API**.

## 🚀 Overview

Infinite Heroes allows users to upload a photo of themselves (and optionally a friend), select a genre, and generate a cohesive, multi-page comic book. The application utilizes the multimodal capabilities of Gemini to handle:
1.  **Storytelling:** Generating plot beats, dialogue, and captions in real-time.
2.  **Visuals:** Generating consistent comic panels while maintaining character likeness using reference images.
3.  **Localization:** Translating the narrative into 15+ languages on the fly.

## ✨ Key Features

*   **Character Consistency:** Uses image-prompting techniques to maintain the likeness of the Hero and Co-Star across different panels and poses.
*   **3D Book Interface:** A custom CSS-3D engine that simulates a real comic book reading experience with page flips and glossy reflections.
*   **Branching Narratives:** Decision points allow the user to influence the direction of the story.
*   **Multi-Language Support:** Generate comics in English, Japanese, Spanish, Arabic, Hindi, and more.
*   **PDF Export:** Download the generated issue as a formatted PDF.
*   **Rich/Novel Mode:** Toggles between standard comic punchiness and deeper, novel-style narration.

## 🤖 AI Models Used

This project relies on the `@google/genai` SDK and targets the **Gemini 2.5 Flash** series for fast, efficient, and accessible generation.

*   **Text & Logic:** `gemini-2.5-flash`
    *   Used for scriptwriting, translation, and JSON structuring.
*   **Visuals:** `gemini-2.5-flash-image`
    *   Used for character sheet generation and final comic panel rendering.

## 🛠️ Tech Stack

*   **Framework:** React 19
*   **Styling:** Tailwind CSS + Custom CSS 3D Transforms
*   **Fonts:** 'Bangers' (Headers) and 'Comic Neue' (Body)
*   **PDF Generation:** `jspdf`
*   **AI Integration:** `@google/genai`

## 📦 Usage

1.  **API Key:** The app prompts you to enter your **Gemini API Key** upon launch. The key is stored safely in your browser's local storage.
2.  **Setup:**
    *   Upload a "Hero" image (Required).
    *   Upload a "Co-Star" image (Optional).
    *   Select Genre (e.g., Sci-Fi, Horror, Slice of Life) and Language.
3.  **Reading:**
    *   Click the cover to open the book.
    *   Click pages to flip them.
    *   Make choices on decision pages to continue the story.
4.  **Export:**
    *   Reach the back cover to download your comic as a PDF.

## 🎨 Prompt Engineering Strategy

The application uses a "Beat" system. Instead of generating the whole story at once, it generates page-by-page "beats" based on the history of previous panels.

*   **Context Window:** The AI is fed a history of previous captions and scene descriptions to ensure continuity.
*   **Structured Output:** The text model returns strict JSON containing `caption`, `dialogue`, `scene`, and `focus_char`.
*   **Reference Images:** The image generation step passes the user's uploaded base64 images as inline data to the model with strict instructions to use them as character references.

## 📝 License

Apache-2.0
