interface CreateSuperAdminRequest {
    email: string;
    name?: string;
}
export declare const createPlatformSuperAdmin: import("firebase-functions/v2/https").CallableFunction<CreateSuperAdminRequest, any, unknown>;
interface DeletePlatformUserRequest {
    uid: string;
}
export declare const deletePlatformUser: import("firebase-functions/v2/https").CallableFunction<DeletePlatformUserRequest, any, unknown>;
export {};
