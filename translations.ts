
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { UiLanguage } from "./types";

export const TRANSLATIONS: Record<UiLanguage, any> = {
    en: {
        // API Key Dialog
        apiKeyTitle: "Identity Check!",
        apiKeySubtitle: "Halt, Citizen! To access the infinite multiverse, you need to provide your ",
        apiKeyPlaceholder: "Paste your Gemini API Key here...",
        missionBriefing: "Mission Briefing",
        missionText: "This experience uses Gemini 2.5 Flash for high-speed generation.",
        enterKeyBtn: "Enter Key & Start",
        statusWaiting: "STATUS: WAITING_FOR_KEY",
        
        // Setup
        heroRequired: "HERO (REQUIRED)",
        ready: "✓ READY",
        replace: "REPLACE",
        uploadHero: "UPLOAD HERO",
        coStarOptional: "CO-STAR (OPTIONAL)",
        uploadCoStar: "UPLOAD CO-STAR",
        namePlaceholder: "Enter Name...",
        privacyPolicy: "The Prohibited Use Policy applies. Do not generate content that infringes on others' privacy rights.",
        theCast: "1. THE CAST",
        theStory: "2. THE STORY",
        genre: "GENRE",
        artStyle: "ARTISTIC MEDIUM",
        storyLanguage: "STORY LANGUAGE",
        premise: "PREMISE",
        premisePlaceholder: "Enter your story premise...",
        novelMode: "NOVEL MODE (Rich Dialogue)",
        launchBtn: "START ADVENTURE!",
        resumeBtn: "RESUME PREVIOUS ISSUE",
        saveFound: "SAVE FOUND",
        launching: "LAUNCHING...",
        remixIdea: "REMIX IDEA:",
        builtWith: "Build with Gemini",
        createdBy: "Created by @ammaar",
        
        // Nemesis / Series
        currentIssue: "ISSUE #",
        wantedVillain: "WANTED: NEMESIS",
        villainStatus: "STATUS:",
        villainStatusActive: "AT LARGE",
        villainStatusReturning: "RETURNING",
        nextIssueBtn: "CONTINUE TO ISSUE #",
        generatingNemesis: "GENERATING NEMESIS...",
        
        // Shared Story Extras
        sharedStoryMode: "SHARED STORY MODE",
        visualizeShared: "VISUALIZE SHARED STORY",
        lockedByStory: "LOCKED BY SHARED SCRIPT",
        shareBtn: "SHARE THIS ISSUE",
        linkCopied: "LINK COPIED!",
        
        // Book / Panel
        whatDrivesYou: "What drives you?",
        printing: "PRINTING...",
        readIssue: "READ ISSUE",
        downloadIssue: "DOWNLOAD ISSUE",
        createNew: "CREATE NEW ISSUE",
        inking: "INKING PAGE...",
    },
    ru: {
        // API Key Dialog
        apiKeyTitle: "Проверка Личности!",
        apiKeySubtitle: "Стоять, Гражданин! Для доступа к мультивселенной требуется ваш ",
        apiKeyPlaceholder: "Вставьте ваш API Key от Gemini...",
        missionBriefing: "Брифинг Миссии",
        missionText: "Мы используем Gemini 2.5 Flash для сверхзвуковой генерации.",
        enterKeyBtn: "Ввести Ключ и Начать",
        statusWaiting: "СТАТУС: ОЖИДАНИЕ_КЛЮЧА",
        
        // Setup
        heroRequired: "ГЕРОЙ (ОБЯЗАТЕЛЬНО)",
        ready: "✓ ГОТОВО",
        replace: "ЗАМЕНИТЬ",
        uploadHero: "ЗАГРУЗИТЬ ГЕРОЯ",
        coStarOptional: "НАПАРНИК (ОПЦИЯ)",
        uploadCoStar: "ЗАГРУЗИТЬ НАПАРНИКА",
        namePlaceholder: "Введите Имя...",
        privacyPolicy: "Действует Политика запрещенного использования. Не нарушайте права конфиденциальности других лиц.",
        theCast: "1. В РОЛЯХ",
        theStory: "2. ИСТОРИЯ",
        genre: "ЖАНР",
        artStyle: "ХУДОЖЕСТВЕННЫЙ СТИЛЬ",
        storyLanguage: "ЯЗЫК ИСТОРИИ",
        premise: "ЗАВЯЗКА",
        premisePlaceholder: "Введите завязку сюжета...",
        novelMode: "РЕЖИМ РОМАНА (Больше текста)",
        launchBtn: "НАЧАТЬ ПРИКЛЮЧЕНИЕ!",
        resumeBtn: "ПРОДОЛЖИТЬ ВЫПУСК",
        saveFound: "НАЙДЕНО СОХРАНЕНИЕ",
        launching: "ЗАПУСК...",
        remixIdea: "ИДЕЯ ДЛЯ РЕМИКСА:",
        builtWith: "Сделано с Gemini",
        createdBy: "Создано @ammaar",

        // Nemesis / Series
        currentIssue: "ВЫПУСК №",
        wantedVillain: "РАЗЫСКИВАЕТСЯ: ВРАГ",
        villainStatus: "СТАТУС:",
        villainStatusActive: "НА СВОБОДЕ",
        villainStatusReturning: "ВОЗВРАЩАЕТСЯ",
        nextIssueBtn: "ЧИТАТЬ ВЫПУСК №",
        generatingNemesis: "ГЕНЕРАЦИЯ ВРАГА...",

        // Shared Story Extras
        sharedStoryMode: "РЕЖИМ СОВМЕСТНОЙ ИСТОРИИ",
        visualizeShared: "ВИЗУАЛИЗИРОВАТЬ ИСТОРИЮ",
        lockedByStory: "ЗАБЛОКИРОВАНО СЦЕНАРИЕМ",
        shareBtn: "ПОДЕЛИТЬСЯ ВЫПУСКОМ",
        linkCopied: "ССЫЛКА СКОПИРОВАНА!",

        // Book / Panel
        whatDrivesYou: "Что движет тобой?",
        printing: "ПЕЧАТЬ...",
        readIssue: "ЧИТАТЬ ВЫПУСК",
        downloadIssue: "СКАЧАТЬ PDF",
        createNew: "СОЗДАТЬ НОВЫЙ",
        inking: "РИСУЕМ СТРАНИЦУ...",
    }
};

export const REMIXES_RU = [
    "Добавь звуки к панелям",
    "Анимируй с Veo 3",
    "Переведи на Клингонский",
    "Добавь генератор злодеев",
    "Распечатай копию",
    "Добавь озвучку",
    "Создай общую вселенную"
];

export const REMIXES_EN = [
    "Add sounds to panels",
    "Animate panels with Veo 3",
    "Localize to Klingon",
    "Add a villain generator",
    "Print physical copies",
    "Add voice narration",
    "Create a shared universe"
];
