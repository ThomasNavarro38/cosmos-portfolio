// Story 7.5: the real path to `decoded`, which production cannot show from outside.
// Run in a page of the built site, by the same means as probe.js. It imports the
// built realism chunk by URL and calls its real `decodeMaps` with the served
// layout artifact and the base. The maps it requests are this probe's, not the
// site's, so read the server's log for repeats before running it.
async () => {
  const base = '/cosmos-portfolio/';
  const assets = [...new Set(performance.getEntriesByType('resource').map((entry) => entry.name).filter((name) => /\/assets\/realism-[^/]+\.js$/.test(name)))];
  if (assets.length !== 1) return { error: `expected one realism chunk on the timeline, found ${JSON.stringify(assets)}` };
  const chunk = assets[0];
  const artifact = await (await fetch(`${base}layout.generated.json`)).json();
  let module;
  try {
    module = await import(chunk);
  } catch (error) {
    return { chunk, stage: 'import', rejected: `${error.name}: ${error.message}` };
  }
  try {
    const images = await module.decodeMaps(artifact, base);
    return { chunk, stage: 'decode', exports: Object.keys(module), resolved: [...images].map(([id, image]) => ({ id, kind: image.constructor.name, width: image.width, height: image.height })) };
  } catch (error) {
    return { chunk, stage: 'decode', exports: Object.keys(module), rejected: `${error.name}: ${error.message}` };
  }
}
