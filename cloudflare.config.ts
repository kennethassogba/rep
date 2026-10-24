import { defineConfig } from 'cf/config';
export default defineConfig({
  accountId: '05838fc24a89cefaf6081066cca13544',
  worker: {
    name: 'rep',
    compatibilityDate: '2026-10-24',
    assets: { notFoundHandling: 'none' },
    domains: ['rep.keff.uk'],
    workersDev: false,
    previewUrls: false,
  },
});
