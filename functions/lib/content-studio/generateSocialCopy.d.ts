type Tone = 'hype' | 'nostalgi' | 'karlek';
interface GenerateRequest {
    shopId: string;
    description: string;
    tone: Tone;
    includeTags: boolean;
    artistTags?: string[];
    imagePaths?: string[];
    videoPaths?: string[];
}
export declare const generateSocialCopy: import("firebase-functions/v2/https").CallableFunction<GenerateRequest, any, unknown>;
export {};
