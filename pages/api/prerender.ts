import type { NextApiRequest, NextApiResponse } from "next";
import prerendercloud from "prerendercloud";

// TL;DR: rewrites defined in next.config.js forward bot traffic to this function
//        which pre-renders the page using Headless-Render-API and returns that pre-rendered page
//        to the user while caching it in Vercel's CDN until the next deploy or CACHE_CONTROL_MAX_AGE_SECONDS

// this middleware, with default settings, can be ignored during development since it's
// only active for certain user-agents: twitterbot, slackbot, etc. defined in next.config.js
// but, to test in development mode:
// `DEBUG=prerendercloud PORT=3000 npm run dev`
// in another terminal launch ngrok (or ssh tunnel) to expose the port
// `ngrok http 3000`
// now that you have a public URL, you can test (after replacing ngrok URL):
// `curl -XGET -i -Atwitterbot 'https://$NGROK_SUB_DOMAIN.ngrok.io/react-router-page-1'`
// and verify pre-rendered content by searching for: "prerender.cloud processed at"

// Read the 5 steps below to understand how it works and configure options:

// STEP 1: Specify pages to be pre-rendered in the `afterFiles` field of next.config.js's 'rewrites()' function
//
// Note 1: `afterFiles` is used rather than `beforeFiles` so requests for static files like index.js, style.css are
// handled first by the vercel router checking the disk
// Note 2: the `has` field is used to restrict this rewrite rule to specific user-agents we want to be
// served pre-rendered content. This same user-agent restrictive filter is also built-in to the
// prerendercloud package, but is much faster when done at the Vercel router layer via their rewrites config.
/*
```
async rewrites() {
  return {
    afterFiles: [
      {
        source: "/:path*",
        destination: "/api/prerender",
        has: [
          {
            type: "header",
            key: "user-agent",
            value: "(slackbot|twitterbot).*",
          },
          
        ],
      },
    ],
```
*/

// STEP 2: make sure your project root includes an .env file with
// the `PRERENDER_TOKEN` environment variable set to your Headless-Render-API API token
// OR you can hardcode it: prerendercloud.set('prerenderToken', 'mySecretToken')
// OR you can configure it from Vercel's web console for env vars in project settings.

// STEP 3: consider configuring how long to cache data from Headless-Render-API
// How long to cache responses from pre-rendering API (Headless-Render-API.com) in Vercel's "cache-control" cache.
// (the cache key comes from the requested URL)
const CACHE_CONTROL_MAX_AGE_SECONDS = 60 * 60 * 24;
// Vercel docs claim this "cache-control" cache clears on each deploy (if your site is using a custom domain).
// https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#cache-invalidation-and-purging
// Sidebar: I'm calling it "cache-control" cache, because that's how we're allowed to control it. Not sure
// what else it's called, possibly CDN cache or "edge-cache".

// STEP 4: place this file (prerender.ts) in the pages/api directory
// and run `vercel deploy --prod`

// STEP 5: testing
// curl -XGET -i -Atwitterbot https://messari.io/asset/bitcoin
// confirm existence of open graph tags
// make same request again and notice it came back instantly from cache
// (see cache-control header)

// STEP 5: done --------------------------------------------------------------

// see this function call for opinions on how to configure the prerendercloud library
configurePrenderLib(prerendercloud);

// This is a Vercel serverless function, not an edge function. The difference
// is this takes a request and a response whereas the edge functions only take a request
// and require an additional export: `export const config { runtime: 'experimental-edge'}`
//
// Note: the prerendercloud library is expressjs middleware, so its interface
//       is is req, res, next. Thus, this Vercel serverless function merely
//       converts NextJS's NextApiRequest and NextApiResponse to the expressjs interface
//       and passes to the prerendercloud library. The same approach is used for
//       Amazon CloudFront here: https://github.com/sanfrancesco/prerendercloud-lambda-edge/tree/master/lib
export default function handler(
  nextApiReq: NextApiRequest,
  nextApiResponse: NextApiResponse
) {
  // uncomment this for more verbose logging
  // console.log("process.env.PRERENDER_TOKEN", process.env.PRERENDER_TOKEN);
  // console.log("pages/api/prerender.ts handler", {
  //   url: nextApiReq.url,
  //   userAgent: nextApiReq.headers["user-agent"],
  // });

  // if anyone requests example.com/api/prerender, it will:
  // 1. hit this function
  // 2. and then prerendercloud middleware would try to pre-render it
  //    which will most likely cause infinte loop
  if (nextApiReq.url && nextApiReq.url.startsWith("/api/prerender")) {
    nextApiResponse.status(404).send("not found");
    return Promise.resolve();
  }

  // create mock to fulfill req/res/next interface expected by prerendercloud library
  // which typically runs as express middleware
  const { req, res, next, waitForPromise } = convertNextJsToReqResNextHandler(
    nextApiReq,
    nextApiResponse
  );

  // call prerendercloud with mocked req/res/next objects
  prerendercloud(req, res, next);

  // return a promise that resolves after the prerendercloud
  // middleware is done writing to the socket
  return waitForPromise.then(() => {
    // console.log("done waiting");
  });
}

function convertNextJsToReqResNextHandler(
  nextApiReq: NextApiRequest,
  nextApiRes: NextApiResponse
): fakeHandler {
  const protocol = nextApiReq.headers.host?.includes("localhost")
    ? "http"
    : "https";
  // note: nextApiReq.url is the pathname (excludes host) of the request before the rewrite
  // also note: in vercel's production environment nextApiReq.url is still just the path, but
  // also has a query parameter ?path appended with the originally requested path
  // for example:
  // twitterbot user-agent requests: /asset/bitcoin
  // vercel dev rewrites to: /api/prerender/asset/bitcoin
  // vercel prod rewrites to: /api/prerender/asset/bitcoin?path=/asset/bitcoin
  const originallyRequestedUrlWithProtocolAndHost = `${protocol}://${nextApiReq.headers.host}${nextApiReq.url}`;

  // friday:
  // figure out whether to strip the :path query from the url
  // * update prerendercloud to try/catch around call to process (so it works with edge functions)
  // * update prerendercloud to expose got function and/or fetch index.html
  // upload API key
  // test it in prod to ensure caching isn't caching the wrong URLs (maybe ok to append :path to the url)

  const headers: NodeJS.Dict<string | undefined> = {};
  let status: number;

  // const url = nextApiReq?.url?.pathname + nextApiReq?.url?.search;
  // let url = "/";
  const url = nextApiReq.url;

  console.log({
    originallyRequestedUrlWithProtocolAndHost,
    url,
    userAgent: nextApiReq.headers["user-agent"],
  });

  const req = {
    connection: { encrypted: true },
    method: nextApiReq.method,
    originalUrl: url,
    url,
    headers: {
      host: nextApiReq.headers.host,
      "user-agent": nextApiReq.headers["user-agent"],
    },
  };

  let callWhenDone: (value: unknown) => void;

  const waitForPromise = new Promise((resolve) => {
    callWhenDone = resolve;
  });

  const res = {
    // the vary package in prerendercloud needs getHeader and setHeader
    getHeader(key: string): string | undefined {
      return headers[key];
    },
    setHeader(key: string, val: string): void {
      // console.log("setHeader", key, val);
      headers[key] = val;
      nextApiRes.setHeader(key, val);
    },
    writeHead(_status: number, _headers: NodeJS.Dict<string | undefined>) {
      // console.log("writeHead", { _status }, _headers);
      status = _status;
      nextApiRes.status(_status);
      Object.keys(_headers).forEach((headerKey) => {
        const header = _headers[headerKey];
        if (!header) {
          return;
        }
        this.setHeader(headerKey, header);
      });
    },
    end(body: string): void {
      // special handler for 301 to use nextJS's redirect method
      if (status == 301) {
        const location = headers["location"];
        if (!location) {
          throw new Error("no location header");
        }

        nextApiRes.redirect(location);
        callWhenDone(null);

        return;
      }

      // vercel will cache the response to this function, using the requested URL as a cache key,
      // if a cache-control header is set on the response.

      // their recommendation is here (note the first max-age=0 is for the user's browser, the 2nd is for vercel):
      // https://vercel.com/docs/concepts/functions/serverless-functions/edge-caching#recommended-cache-control
      nextApiRes.setHeader(
        "Cache-Control",
        `max-age=0, s-maxage=${CACHE_CONTROL_MAX_AGE_SECONDS}, stale-while-revalidate`
      );

      nextApiRes.send(body);
      callWhenDone(null);
    },
  };

  function next() {
    // Thoughts on implementing this next interface:
    // First of all, not critical: since we're already restricting the traffic driven to this function
    // via afterFiles and bot filtering rewrite rule, this will rarely be called. But if we did want to call it
    // (for example: after repeated 500 errors from upstream Headless-Render-API)
    // 1. it seems like there's no `rewrite` method on nextApiRes (to rewrite to /index.html)
    // 2. and calling next (assuming it was even possible) doesn't make since we've already
    //    used the `rewrites` feature to rewrite the URL to /api/prerender/:path*
    // 3. but we could simply fetch the /index.html and return the response
    // console.log("calling next", { originallyRequestedUrlWithProtocolAndHost });
    prerendercloud
      ._got(originallyRequestedUrlWithProtocolAndHost, {
        encoding: null,
        retries: 3,
        headers: {
          "user-agent": "prerender-vercel-middleware-nextfn",
        },
      })
      .then((res: any) => {
        nextApiRes.send(res.body);
        callWhenDone(null);
      })
      .catch((err: any) => {
        nextApiRes.status(500).send(err.toString());
        callWhenDone(null);
      });
  }

  return { req, res, next, waitForPromise };
}

function configurePrenderLib(pcloudlib: any) {
  // Otto recommendation: leave commented out for default config of 5 minute server cache
  //
  // Headless-Render-API's responses, by default, are cached for 5 minutes
  // at service.headless-render-api.com's servers
  // but since we're using Verel's Cache-Control, we probably don't care
  // about caching data in Headless-Render-API since we're unlikely
  // to benefit from a 2nd, Nth response coming from cache
  // UNLESS the first request times out in this handler, but finishes behind
  // the scenes at Headless-Render-API (and also gets cached) so then our 2nd request
  // comes back immediately from that cache
  // pcloudlib.set("disableServerCache", true);

  // Otto recommendation: uncomment this config since primary use case is open graph and/or meta
  //                      tags and by only including the pre-rendered meta tags, avoid any possible
  //                      bugs caused by rehydrating pre-rendered content
  // uncomment this if you only care about the meta tags, e.g. open graph tags
  // this will return the original index.html with the pre-rendered content between
  // the <head> and </head> tags only
  prerendercloud.set("metaOnly", () => true);

  // Otto recommendation: uncomment to sanitize the URLs as much as possible to prevent
  //                      abusive bots trolling random URLs like /assets/bitcoin?wpadmin=1234
  //                      if you need some query params to be respected for the pre-render, add them
  //                      explicitly to this array, else they will be removed from the URL
  prerendercloud.set("whitelistQueryParams", () => []);

  // options below unlikely to change ----------------------------------------

  // disabling because we're not using Headless-Render-API's mocked/stubbed XHR calls feature
  pcloudlib.set("disableAjaxBypass", true);
  // disabling because we're not using Headless-Render-API's mocked/stubbed XHR calls feature
  pcloudlib.set("disableAjaxPreload", true);
  // comment this out (enable feature) if it becomes obvious that we're getting duplicate
  // meta tags from the pre-rendering + client hydration and/or
  // it's causing problems for our use case (pre-rendering twitterbot, telegram, etc.)
  pcloudlib.set("disableHeadDedupe", true);

  // we use vercel's cache-control cache so we don't need this middleware local cache
  // (nor does in-mempry cache for a serverless function make much sense)
  // prerendercloud.set('enableMiddlewareCache', true);
  // prerendercloud.set('middlewareCacheMaxBytes', 1000000000); // 1GB

  // we are already filtering the user-agent (for bots only) in vercel's rewrite section
  // of next.config.js, so we don't need to do it again here via botsOnly or lists.
  //
  // prerendercloud.set("botsOnly", true);
  //
  // likewise: whitelistPaths/blacklistPaths.
  //
  // prerendercloud.set("whitelistPaths", req => [
  //   "/docs",
  //   "/docs/"
  //   /\/users\/\d{1,6}\/profile$/, // without the ending $, this is equivalent to startsWith
  //   /\/users\/\d{1,6}\/profile\/?$/, // note the optional ending slash (\/?) and $
  //   "/google-domain-verification.html",
  //   "/google-domain-verification/",
  // ]);
  // prerendercloud.set("blacklistPaths", req => [
  //   "/google-domain-verification",
  //   "/google-domain-verification.html",
  //   "/google-domain-verification/",
  //   "/image-gallery/*",
  // ]);
}

// create typescript type for fakeHandler:
interface fakeHandler {
  req: {
    connection: any;
    method: string | undefined;
    originalUrl: string | undefined;
    url: string | undefined;
    headers: {
      host: string | undefined;
      "user-agent": string | undefined;
    };
  };
  res: {
    getHeader: (key: string) => string | undefined;
    setHeader: (key: string, val: string) => void;
    writeHead: (status: number, headers: { [key: string]: string }) => void;
    end: (body: string) => void;
  };
  next: () => void;
  waitForPromise: Promise<unknown>;
}
