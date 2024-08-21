import { zeroPad } from "./utils";
import { addTask, updateTask } from "../state";
import { Task } from "../common";

/**
 * Part number, mp3 file content, and calculated duration
 */
export class FetchResult {
  part: number;
  content: Uint8Array;
  duration: number;

  constructor(part: number, content: Uint8Array, duration: number) {
    this.part = part;
    this.content = content;
    this.duration = duration;
  }
}

/**
 * Fetch and calculate duration of a part file
 *
 * @param part Part number
 * @param url Url to file
 */
export async function fetchPart(part: number, url: URL, cookie: string): Promise<Uint8Array> {
  const downloadTask = await addTask(new Task(`Part${zeroPad(part)}`, "Download", "Running"));
  console.log(`Fetching ${url}`);

  // bonafides-d seems to be an important cookie
  // the special characters needs to be escaped, otherwise you will get a 403
  const escaped_cookie = encodeURIComponent(cookie);
  await browser.cookies.set({
    url: url.href,
    name: "d",
    value: escaped_cookie,
  });
  await browser.cookies.set({
    url: url.href,
    name: "_sscl_d",
    value: escaped_cookie,
  });
  
  const response = await fetch(url);
  const content = new Uint8Array(await response.arrayBuffer());
  await updateTask(downloadTask, "Completed");
  return content;
}


/**
 * Fetch and calculate duration of a part file
 *
 * @param part
 * @param url
 * @param decode
 */
export async function fetchPartWithDuration(part: number, url: URL, decode: boolean, state: LoadState): Promise<FetchResult> {
  const content = await fetchPart(part, url, state.bonafides_d);
  let duration;
  if (decode) {
    const decodeTask = await addTask(new Task(`Part${zeroPad(part)}`, "Decoding Audio", "Running"));
    const audioContext = new AudioContext();
    const copy = new Uint8Array(content);
    const buffer = await audioContext.decodeAudioData(copy.buffer);
    duration = buffer.duration
    await updateTask(decodeTask, "Completed");
  } else {
    import("music-metadata");
    const musicMetadata = await import("music-metadata");
    const partMeta = await musicMetadata.parseBuffer(content);
    duration = partMeta.format.duration;
  }
  return new FetchResult(part, content, duration);
}

