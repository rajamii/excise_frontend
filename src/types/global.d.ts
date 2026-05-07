export {};

declare global {
  interface Window {
    loadBillDeskSdk: (config: any) => void;
  }
}