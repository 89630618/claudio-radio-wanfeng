import assert from "node:assert/strict";
import test from "node:test";

const { resolveDirectTrack } = await import("./direct.ts");

test("direct requests resolve exclusively from KuGou API search results", async () => {
  let receivedQuery = "";
  const result = await resolveDirectTrack("播放 My Soul", async (query) => {
    receivedQuery = query;
    return [
      {
        title: "My Soul (忧伤还是快乐)",
        artist: "July",
        album: "My Soul",
        hash: "api-only-my-soul"
      },
      {
        title: "My Soul (忧伤还是快乐)",
        artist: "July",
        album: "Another Album",
        hash: "api-only-my-soul-duplicate"
      },
      {
        title: "July",
        artist: "July",
        hash: "unrelated-result"
      }
    ];
  });

  assert.equal(receivedQuery, "My Soul");
  assert.equal(result.reason, "matched");
  assert.equal(result.match?.source, "kugou-api");
  assert.match(result.match?.artist ?? "", /July/i);
});

test("API search keeps the provider's first version when the title suffix is only descriptive", async () => {
  const result = await resolveDirectTrack("播放 My Soul", async () => [
    { title: "My Soul (忧伤还是快乐)", artist: "July", hash: "july-my-soul" },
    { title: "My Soul", artist: "张新成", hash: "zhang-my-soul" }
  ]);

  assert.equal(result.reason, "matched");
  assert.match(result.match?.artist ?? "", /July/i);
});

test("next-track wording still resolves through the API search path", async () => {
  let receivedQuery = "";
  const result = await resolveDirectTrack("下一首播放 遇见", async (query) => {
    receivedQuery = query;
    return [{ title: "遇见", artist: "孙燕姿", hash: "api-yujian" }];
  });

  assert.equal(receivedQuery, "遇见");
  assert.equal(result.reason, "matched");
  assert.match(result.match?.artist ?? "", /孙燕姿/);
});
