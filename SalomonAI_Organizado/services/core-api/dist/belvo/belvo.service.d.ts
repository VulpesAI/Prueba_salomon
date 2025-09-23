import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export interface BelvoInstitution {
    id: string;
    name: string;
    type: string;
    website: string;
    display_name: string;
    country_codes: string[];
    primary_color: string;
    logo: string;
}
export interface BelvoLink {
    id: string;
    institution: string;
    access_mode: string;
    last_accessed_at: string;
    status: string;
    created_by: string;
    external_id: string;
}
export interface BelvoAccount {
    id: string;
    link: string;
    institution: {
        name: string;
        type: string;
    };
    collected_at: string;
    category: string;
    type: string;
    name: string;
    number: string;
    balance: {
        current: number;
        available: number;
    };
    currency: string;
    bank_product_id: string;
    internal_identification: string;
    public_identification_name: string;
    public_identification_value: string;
    last_accessed_at: string;
    credit_data: any;
    loan_data: any;
}
export interface BelvoTransaction {
    id: string;
    account: string;
    collected_at: string;
    value_date: string;
    accounting_date: string;
    amount: number;
    currency: string;
    description: string;
    observations: string;
    merchant: {
        name: string;
        website: string;
    };
    category: string;
    subcategory: string;
    reference: string;
    type: string;
    status: string;
    internal_identification: string;
    balance: number;
}
export declare class BelvoService {
    private readonly configService;
    private readonly httpService;
    private readonly baseUrl;
    private readonly secretId;
    private readonly secretPassword;
    private readonly environment;
    constructor(configService: ConfigService, httpService: HttpService);
    private getRequestConfig;
    getInstitutions(countryCode?: string): Promise<BelvoInstitution[]>;
    createLink(institution: string, username: string, password: string, externalId?: string): Promise<BelvoLink>;
    getAccounts(linkId: string): Promise<BelvoAccount[]>;
    getTransactions(linkId: string, dateFrom?: string, dateTo?: string, accountId?: string): Promise<BelvoTransaction[]>;
    getBalances(linkId: string, accountId?: string): Promise<any[]>;
    deleteLink(linkId: string): Promise<void>;
    getLinkStatus(linkId: string): Promise<BelvoLink>;
    syncRecentTransactions(linkId: string, days?: number): Promise<BelvoTransaction[]>;
    convertBelvoTransaction(belvoTransaction: BelvoTransaction, userId: string): any;
    private mapBelvoCategory;
}
