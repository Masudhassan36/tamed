This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## TAMED assets and deployment

Approved logo artwork can be placed in `public/images/` and passed to the shared `Logo` component; the text wordmark remains the fallback until official artwork is available. Article covers are stored in `public/images/articles/`, and the active favicon is `src/app/favicon.ico`.

Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin when deploying. Article Open Graph and Twitter cover-image URLs are emitted only when this value is configured; no production domain is assumed.

Issue 2 is available at `/issue-2`. Each published piece opens as a full article on the site; the original submission PDFs are retained only in `.issue2-import/` and are not used as the reading experience.

## Updating the TAMED submission service

1. In **TAMED Submissions Database → Extensions → Apps Script**, replace the submission API code with `apps-script/tamed-submission.gs` and save. Run `testSetup` and check that both tabs and the Drive folder are reachable.
2. Run `installUploadCleanup` once as the deployment owner. This schedules cleanup of staging sessions older than 24 hours. Staging uses a private Drive folder created by the script.
3. In **Deploy → Manage deployments**, edit the existing web app deployment, choose **New version**, and deploy. Keep the same execution identity, access settings, and `/exec` URL. Publish the website after the script update. The site uses its existing `GOOGLE_SCRIPT_URL` environment variable.

The form sends uploads in 3 MB parts and accepts 20 MB total for the manuscript and cover. The script stores the original files in the existing Drive subfolders. The sheet columns stay in their current order, and a note on each new submission ID links it to the upload session so a retry can recover the same receipt.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# tamed
