// Validation workload for deoptkit: parses realistic, varied records through
// schemas compiled from the published Bluesky Lexicons. Run against the built
// output so that the profile reflects what users execute.
import { readdirSync, readFileSync } from "node:fs";
import { observed } from "deoptkit/harness";
import * as v from "valibot";
import { compileLexicons } from "../dist/index.mjs";

const directory = new URL(
  "../src/__tests__/fixtures/lexicons/",
  import.meta.url
);
const docs = readdirSync(directory)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(new URL(file, directory), "utf8")));

const placeholder = (nsid, name) =>
  v.looseObject({
    $type: v.optional(v.literal(name === "main" ? nsid : `${nsid}#${name}`))
  });
const compiled = compileLexicons(docs, { resolve: placeholder });
const post = compiled["app.bsky.feed.post"].main;
const threadViewPost = compiled["app.bsky.feed.defs"].threadViewPost;
const message = compiled["com.atproto.sync.subscribeRepos"].main.message.schema;

const cid = (seed) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let digest = "";
  for (let index = 0; index < 50; index++) {
    digest += alphabet[(index * 7 + seed) % 32];
  }
  return `bafyrei${"abcdefgh"[seed % 8]}${digest}a`;
};
const did = (seed) =>
  `did:plc:${"abcdefghijklmnopqrstuvwxyz234567".slice(seed % 8, (seed % 8) + 24)}`;
const uri = (seed) =>
  `at://${did(seed)}/app.bsky.feed.post/3jzfcijpj2z${"abcdefgh"[seed % 8]}`;

// Posts vary in which optional fields are present and which embed is used,
// so the object shapes seen by validation are realistically mixed.
const posts = Array.from({ length: 64 }, (_, index) => {
  const record = {
    $type: "app.bsky.feed.post",
    text: `Post number ${index} ${"🙂".repeat(index % 5)}`,
    createdAt: new Date(1700000000000 + index * 1000).toISOString()
  };
  if (index % 2) record.langs = ["en", "pt-BR"].slice(0, (index % 2) + 1);
  if (index % 3) {
    record.reply = {
      root: { uri: uri(index), cid: cid(index) },
      parent: { uri: uri(index + 1), cid: cid(index + 1) }
    };
  }
  if (index % 4 === 0) {
    record.embed = {
      $type: "app.bsky.embed.images",
      images: [
        {
          image: {
            $type: "blob",
            ref: { $link: cid(index) },
            mimeType: "image/png",
            size: 1000 + index
          },
          alt: "alt"
        }
      ]
    };
  } else if (index % 4 === 1) {
    record.embed = {
      $type: "app.bsky.embed.external",
      external: { uri: "https://example.com", title: "t", description: "d" }
    };
  } else if (index % 4 === 2) {
    record.embed = { $type: "app.bsky.embed.future", data: index };
  }
  if (index % 5 === 0) record.tags = ["a", "b"];
  if (index % 7 === 0) {
    record.labels = {
      $type: "com.atproto.label.defs#selfLabels",
      values: [{ val: "nudity" }]
    };
  }
  return record;
});

// A thread view nests posts recursively through lazy unions.
const postView = (seed) => ({
  $type: "app.bsky.feed.defs#postView",
  uri: uri(seed),
  cid: cid(seed),
  author: {
    $type: "app.bsky.actor.defs#profileViewBasic",
    did: did(seed),
    handle: "alice.test"
  },
  record: posts[seed % posts.length],
  indexedAt: new Date(1700000000000 + seed).toISOString(),
  likeCount: seed
});
const thread = (seed, depth) => ({
  $type: "app.bsky.feed.defs#threadViewPost",
  post: postView(seed),
  replies:
    depth === 0
      ? []
      : [
          thread(seed + 1, depth - 1),
          thread(seed + 2, depth - 1),
          {
            $type: "app.bsky.feed.defs#notFoundPost",
            uri: uri(seed),
            notFound: true
          }
        ]
});
const threads = Array.from({ length: 8 }, (_, index) => thread(index, 4));

const messages = Array.from({ length: 32 }, (_, index) => {
  if (index % 3 === 0) {
    return {
      $type: "com.atproto.sync.subscribeRepos#commit",
      seq: index,
      rebase: false,
      tooBig: false,
      repo: did(index),
      commit: { $link: cid(index) },
      rev: "3jzfcijpj2z2a",
      since: index % 2 ? null : "3jzfcijpj2z2a",
      blocks: { $bytes: "AAECAw" },
      ops: [
        {
          action: "create",
          path: "app.bsky.feed.post/3jzfcijpj2z2a",
          cid: { $link: cid(index) }
        }
      ],
      blobs: [],
      time: new Date(1700000000000 + index).toISOString()
    };
  }
  if (index % 3 === 1) {
    return {
      $type: "com.atproto.sync.subscribeRepos#identity",
      seq: index,
      did: did(index),
      time: new Date().toISOString(),
      handle: "alice.test"
    };
  }
  return {
    $type: "com.atproto.sync.subscribeRepos#account",
    seq: index,
    did: did(index),
    time: new Date().toISOString(),
    active: index % 2 === 0,
    status: "takendown"
  };
});

let failures = 0;
const check = (schema, value) => {
  if (!v.safeParse(schema, value).success) failures++;
};

observed("parse post", (i) => check(post, posts[i % posts.length]), {
  iterations: 40_000
});
observed(
  "parse thread",
  (i) => check(threadViewPost, threads[i % threads.length]),
  { iterations: 4_000 }
);
observed(
  "parse firehose message",
  (i) => check(message, messages[i % messages.length]),
  { iterations: 40_000 }
);

if (failures > 0) {
  throw new Error(
    `${failures} samples failed validation; the workload is wrong`
  );
}
