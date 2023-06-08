# prerendercloud-nextjs

<img align="right" src="https://cloud.githubusercontent.com/assets/22159102/21554484/9d542f5a-cdc4-11e6-8c4c-7730a9e9e2d1.png">

This is an example React Next.js app configured with [Headless-Render-API.com](https://headless-render-api.com) pre-rendering. Note: we launched in 2016 as prerender.cloud, rebranded in 2022 as Headless-Render-API.com.

This app was created with:

```
npx create-next-app@latest --typescript nextjs-test1
```

- It has one additional import: `prerendercloud`
- Its purpose is to demonstrate https://headless-render-api.com/ usage from Vercel
- It works by executing a Vercel serverless function to retrieve pre-rendered content from Headless-Render-API and return it to the user if the user is a bot (twitterbot etc) and the page is not a NextJS page or static asset.
- The pre-rendered content is cached (for CACHE_CONTROL_MAX_AGE_SECONDS) in Vercel's CDN and cleared on each deploy.
- Read [pages/api/prerender.ts](/pages/api/prerender.ts) for instructions.
- Read [next.config.js](next.config.js) for controlling which requests get pre-rendered content.
