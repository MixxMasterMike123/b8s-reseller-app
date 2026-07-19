export interface CfConfig {
    token: string;
    zoneId: string;
    accountId: string;
    kvNamespaceId: string;
}
export declare function getCfConfig(): CfConfig | null;
export declare function requireCfConfig(): CfConfig;
export declare const CF_SECRETS: readonly ["CHOPSHOP_CF_API_TOKEN", "CHOPSHOP_CF_ZONE_ID", "CHOPSHOP_CF_ACCOUNT_ID", "CHOPSHOP_CF_KV_NAMESPACE_ID"];
export interface CfCustomHostname {
    id: string;
    hostname: string;
    status: string;
    ssl?: {
        status?: string;
        validation_errors?: Array<{
            message: string;
        }>;
    };
    verification_errors?: string[];
    ownership_verification?: {
        type?: string;
        name?: string;
        value?: string;
    };
}
export declare function cfCreateCustomHostname(cfg: CfConfig, hostname: string): Promise<CfCustomHostname>;
export declare function cfGetCustomHostname(cfg: CfConfig, id: string): Promise<CfCustomHostname>;
export declare function cfDeleteCustomHostname(cfg: CfConfig, id: string): Promise<void>;
export declare function cfKvPut(cfg: CfConfig, key: string, value: string): Promise<void>;
export declare function cfKvDelete(cfg: CfConfig, key: string): Promise<void>;
export declare function cfCnameTarget(): string;
