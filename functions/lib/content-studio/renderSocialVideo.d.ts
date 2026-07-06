interface RenderRequest {
    shopId: string;
    assetPaths: string[];
    audioPath?: string;
    targetSec?: number;
    bpm?: number;
}
export declare const renderSocialVideo: import("firebase-functions/v2/https").CallableFunction<RenderRequest, any, unknown>;
export {};
