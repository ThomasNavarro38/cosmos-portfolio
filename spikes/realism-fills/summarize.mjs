// Prints the harness tables of realism-fills-7-6.md from a recheck's JSON (story 7.6), each
// cell reading 1920×1080 / 390×844. The production tables come from screenshots and
// compare.mjs, not from here.
//   node spikes/realism-fills/summarize.mjs spikes/realism-fills/results/run.json
import { readFileSync } from 'node:fs';

const text = readFileSync(process.argv[2], 'utf8');
const data = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
const NAMES = ['1920x1080@1', '390x844@2'].filter((name) => data[name] !== undefined);
const runs = NAMES.map((name) => data[name]);
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
const each = (read) => runs.map(read).join(' / ');
const group = (run, test) => run.own.filter((row) => !row.deep && test(row.pose));

console.log('environment:', JSON.stringify(runs[0].environment), 'neutral off ground:', each((run) => run.neutral.offGround));

if (runs[0].own) {
  console.log('\n## Own marks, whole scene: poses | lost | lost on real | excluded | reach | reach on real');
  for (const [name, test] of [
    ['Keyframe 0 and stops', (pose) => /^(stop|keyframe)/.test(pose)],
    ['Focus', (pose) => pose.startsWith('focus')],
    ['Approached', (pose) => pose.startsWith('approached')],
  ]) {
    const cell = (key) => each((run) => sum(group(run, test), key));
    console.log(`| ${name} | ${each((run) => group(run, test).length)} | ${cell('lost')} | ${cell('lostOnReal')} | ${cell('excluded')} | ${cell('controlLost')} | ${cell('controlLostOnReal')} |`);
  }
  console.log('poses with reach 0:', each((run) => run.own.filter((row) => !row.deep && row.controlLost === 0).length), 'of', each((run) => run.own.filter((row) => !row.deep).length));
  console.log('smallest reach:', each((run) => Math.min(...run.own.filter((row) => !row.deep).map((row) => row.controlLost))), ' smallest comparator control:', each((run) => Math.min(...run.own.filter((row) => !row.deep).map((row) => row.comparatorControl))));
  console.log('approached subject stops, per pose:', each((run) => group(run, (pose) => pose.startsWith('approached')).map((row) => `${row.pose.split(',')[0].slice(11)}:${row.controlLost}`).join(' ')));

  console.log('\n## A Ring, a Moon and the outline: pose (achieved radius) | ring lost, reach, control of pixels | moon ... | outline ...');
  for (const [at, row] of runs[0].own.filter((one) => one.deep).entries()) {
    const rows = runs.map((run) => run.own.filter((one) => one.deep)[at]);
    const mark = (name) => rows.map((one) => `${one[name].lost}+${one[name].lostOnReal}, ${one[name].controlLost}/${one[name].controlLostOnReal}, ${one[name].comparatorControl} of ${one[name].markPixels}`).join(' / ');
    console.log(`| ${row.pose} (${rows.map((one) => one.achievedRadiusPx).join(' / ')}px) | ${mark('ring')} | ${mark('moon')} | ${mark('outline')} |`);
  }
}

if (runs[0].lighting) {
  console.log('\n## Lighting: Planet at pose | in-plane | radius | toward | away | control toward | control away | verdict, control');
  for (const [at, row] of runs[0].lighting.entries()) {
    const rows = runs.map((run) => run.lighting[at]);
    const cell = (key) => rows.map((one) => one[key]).join(' / ');
    console.log(`| ${row.id} ${row.pose} | ${cell('inPlane')} | ${cell('radiusPx')} | ${cell('toward')} | ${cell('away')} | ${cell('controlToward')} | ${cell('controlAway')} | ${cell('verdict')}; ${cell('controlVerdict')} |`);
  }
  console.log('rows toward brighter:', each((run) => run.lighting.filter((row) => row.verdict === 'toward is brighter').length), 'of', each((run) => run.lighting.length), ' flipped:', each((run) => run.lighting.filter((row) => row.controlVerdict === 'flipped').length));
}

if (runs[0].edges) {
  console.log('\n## Edge: class | Planets | outline radius | largest centre offset | largest edge deviation');
  const rowsOf = (run, test) => run.edges.flatMap((row) => row.planets.map((planet) => ({ pose: row.pose, ...planet }))).filter((row) => row.radiusPx !== undefined && test(row.pose));
  for (const [name, test] of [['Client stop', (pose) => pose.startsWith('stop')], ['Rail, between stops', (pose) => pose.startsWith('rail')], ['Focus', (pose) => pose.startsWith('focus')]]) {
    const worst = (read) => each((run) => Math.max(...rowsOf(run, test).map(read)).toFixed(2));
    console.log(`| ${name} | ${each((run) => rowsOf(run, test).length)} | ${each((run) => `${Math.min(...rowsOf(run, test).map((row) => row.radiusPx))} to ${Math.max(...rowsOf(run, test).map((row) => row.radiusPx))}`)} | ${worst((row) => row.centreOffsetPx)} | ${worst((row) => Math.max(Math.abs(row.edgeMax - row.predictedFillPx), Math.abs(row.edgeMin - row.predictedFillPx)))} |`);
  }
  const large = (run) => rowsOf(run, () => true).filter((row) => row.radiusPx >= 8);
  console.log('at radius >= 8px: planets', each((run) => large(run).length), ' largest centre offset', each((run) => Math.max(...large(run).map((row) => row.centreOffsetPx))), ' largest edge deviation', each((run) => Math.max(...large(run).map((row) => Math.max(Math.abs(row.edgeMax - row.predictedFillPx), Math.abs(row.edgeMin - row.predictedFillPx)))).toFixed(2)), ' any bin empty:', each((run) => large(run).filter((row) => { const [have, of] = row.binsWithEdge.split(' of '); return have !== of; }).length));
}

if (runs[0].ceiling) {
  const poses = (run) => run.ceiling.filter((row) => row.pose);
  const control = (run) => run.ceiling.find((row) => row.control);
  console.log('\n## Ceiling');
  console.log('poses:', each((run) => poses(run).length), ' over the limit:', each((run) => sum(poses(run), 'over')), ' peak:', each((run) => Math.max(...poses(run).map((row) => row.peak))), ' limit:', poses(runs[0])[0].limit);
  console.log('overdriven, ceiling on:', each((run) => control(run).peakWithCeiling), ' written out:', each((run) => control(run).peakWithout));
}

if (runs[0].rail) {
  console.log('\n## Rail');
  const r = (read) => each((run) => read(run.rail));
  console.log('frames', r((x) => x.frames), ' overlaps any size', r((x) => x.overlapsAnySize), ' on a disc of 3px+', r((x) => x.overlaps), ' testable', r((x) => x.testable), ' showing through', r((x) => x.showThrough), ' control', r((x) => x.control.showThrough));
  console.log('frames with a line on a disc', r((x) => x.flicker.framesWithLineOnDisc), ' line pixels', r((x) => x.flicker.linePixelsOnDisc), ' changed while the line stayed', r((x) => x.flicker.flipsWhereLineStayed), ' in frames', r((x) => x.flicker.framesWithStayedFlip), ' most in one', r((x) => x.flicker.perFrameMaxStayedFlips), ' control, bias alternating', r((x) => x.flicker.controlAlternatingBias));
}
if (runs[0].pair) {
  console.log('\n## Staged pair');
  console.log('rear-mark pixels', each((run) => sum(run.pair, 'testable')), ' showing through', each((run) => sum(run.pair, 'showThrough')), ' control', each((run) => sum(run.pair, 'controlShowThrough')));
}
if (runs[0].held) {
  console.log('\n## Held at Focus');
  console.log('line pixels', each((run) => sum(run.held, 'linePixels')), ' always hidden', each((run) => sum(run.held, 'hiddenAlways')), ' hidden in some frames only', each((run) => sum(run.held, 'shownSometimesHiddenSometimes')), ' control, bias alternating', each((run) => sum(run.held, 'controlAlternatingBias')));
}
