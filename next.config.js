// see Headless-Render-API's bot list here: https://github.com/sanfrancesco/prerendercloud-nodejs/blob/ede09c50b879d64593cfc98065eb0a2601fcb7ff/source/index.js#L45
// for our use case, we don't care about pre-rendering for search engines (since pre-rendered content is not always perfect)
// but we do want pre-rendering for meta/open-graph tags
const botsOnlyList = [
  // "googlebot",
  // "yahoo",
  // "bingbot",
  // "yandex",
  // "baiduspider",
  "facebookexternalhit",
  "twitterbot",
  "rogerbot",
  "linkedinbot",
  "embedly",
  "quora link preview",
  "showyoubot",
  "outbrain",
  "pinterest/0.",
  "pinterestbot",
  "developers.google.com/+/web/snippet",
  "slackbot",
  "vkShare",
  "W3C_Validator",
  "redditbot",
  "Applebot",
  "WhatsApp",
  "flipboard",
  "tumblr",
  "bitlybot",
  "Bitrix link preview",
  "XING-contenttabreceiver",
  "Discordbot",
  "TelegramBot",
  // "Google Search Console",
];

const prerenderRewriteConditions = [
  // array of conditions means AND operator, all must be true for rule to match

  // This rule avoids re-entering pre-rendering handler if our middleware file itself
  // bails out (calls the next() function)
  {
    type: "header",
    key: "user-agent",
    // match anything that doesn't start with prerender
    // e.g. "prerender-vercel-middleware-nextfn", or "prerendercloud"
    // value: "^(?!prerender).*$", // does not work
    value: "^(?!.*prerender).*$",
    // ^(?!.*prerender)(twitterbot|googlebot).*$ // this works, but i prefer 2 separate rules
  },
  {
    type: "header",
    key: "user-agent",
    // value: "(slackbot|twitterbot).*",
    value: `(${botsOnlyList.join("|")}).*`,
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return {
      // section 1. uncomment beforeFiles to rewrite requests to our pre-rendering function
      //    for pages in the NextJS pages directory that aren't yet using NextJS SSR/ISR
      // section 2.        use afterFiles to rewrite requests to our pre-rendering function
      //    for pages not in the NextJS pages directory
      // section 3. once a page is in NextJS pages directory, and is using NextJS SSR/ISR
      //    its rewrite (if a specific rule exists) can be removed
      //
      // section 1 ---------------------------------------------------------------
      // beforeFiles: [
      //   {
      //     source: "/some-page-already-as-nextjs-page-but-without-ssr/:slug",
      //     destination: "/api/prerender",
      //     has: prerenderRewriteConditions,
      //   },
      // ],
      //
      // section 2 ---------------------------------------------------------------
      // this afterFiles will catch everything that is not a NextJS page and not a static file
      // for even more control, create a rule for each page as a source, e.g. /asset/:slug, /exchange/:slug
      afterFiles: [
        {
          source: "/:path*",
          destination: "/api/prerender",
          has: prerenderRewriteConditions,
        },
      ],
      beforeFiles: [
        {
          source: "/page1",
          destination: "/api/prerender",
          has: prerenderRewriteConditions,
        },
        {
          source: "/page1/:id/nested",
          destination: "/api/prerender",
          has: prerenderRewriteConditions,
        },
      ],
      fallback: [
        {
          source: "/:any*",
          destination: "/",
        },
      ],
    };
  },
  // The following commented out rule is the simplest possible pre-rendering integration with Vercel:
  // It's akin to proxying certain user-agents directly to service.headless-render-api.com - thus
  // no middleware, serverless function, etc. is needed. Only this rule:
  // async rewrites() {
  //   return {
  //     afterFiles: [
  //       {
  //         source: "/asset/:path*",
  //         // note: Headless-Render-API does not support api keys via query strings
  //         //       so this solution is currently theoretical
  //         destination:
  //           "http://localhost:3001/:path*?headlessRenderApiKey=someSecretKey",
  //         has: [
  //           {
  //             type: "header",
  //             key: "user-agent",
  //             value: "(slackbot|twitterbot).*",
  //           },
  //         ],
  //       },
  //     ],
  //   };
  // },
};

module.exports = nextConfig;
