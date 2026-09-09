export type LocaleCode = string;
export type LocaleDict = {
  [K in keyof typeof import("../locales/en-US").locale]: string;
};
export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  isBuiltin: boolean;
}
