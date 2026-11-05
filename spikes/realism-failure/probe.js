// The failure check's reading of a page (story 7.5). Waits past the 10 seconds the
// record asks for, then reads what happened on this origin.
//
// This file is one function expression. To run it, either evaluate the file with
// chrome-devtools-mcp's evaluate_script (`sourcePath`), or paste it into the
// DevTools console wrapped as `await (<the function>)()`.
async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const shape = () => {
    const tags = [...document.querySelectorAll('body *')].map((node) => node.tagName).join(' ');
    let hash = 0;
    for (const char of tags) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return { nodes: document.querySelectorAll('body *').length, hash };
  };
  const requests = () => performance.getEntriesByType('resource')
    .filter((entry) => entry.name.startsWith(location.origin))
    .map((entry) => ({ path: entry.name.slice(location.origin.length), start: Math.round(entry.startTime), status: entry.responseStatus, by: entry.initiatorType }));
  const domAtStart = shape();
  await sleep(11_000);
  const all = requests();
  const realism = all.filter((request) => /realism-|textures\//.test(request.path));
  const mark = performance.getEntriesByName('schematic-first-frame').map((entry) => entry.startTime);
  return {
    href: location.href,
    navigations: performance.getEntriesByType('navigation').length,
    mark,
    firstRealismRequest: realism.length === 0 ? null : Math.min(...realism.map((request) => request.start)),
    realism,
    domAtStart,
    domAfter11s: shape(),
    alertLike: document.querySelectorAll('[role="alert"], [role="status"], dialog').length,
  };
}
