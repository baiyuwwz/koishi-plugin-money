import { Context, Schema } from 'koishi';
export declare const name = "money";
export interface Config {
}
export declare const Config: Schema<Config>;
export declare const inject: string[];
declare module 'koishi' {
    interface Tables {
        money: Money;
    }
    interface Context {
        money: MoneyAPI;
    }
}
export interface Money {
    userId: string;
    channelId: string;
    currencyName: string;
    amount: number;
}
export interface MoneyAPI {
    add: (userId: string, channelId: string, currencyName: string, amount: number) => Promise<boolean>;
    reduce: (userId: string, channelId: string, currencyName: string, amount: number) => Promise<boolean | number>;
    get: (userId: string, channelId: string, currencyName: string) => Promise<number | undefined>;
}
export declare function apply(ctx: Context): void;
