export interface HNCommentsSettings {
    enhancedLinks: boolean;
    openNoteAutomatically: boolean;
    filenameTemplate: string;
    wrapHtmlTags: boolean;
}

export const DEFAULT_SETTINGS: HNCommentsSettings = {
    enhancedLinks: false,
    openNoteAutomatically: true,
    filenameTemplate: "HN - {{title}} - {{date}}",
    wrapHtmlTags: true
};