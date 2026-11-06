// Prints the Star tables of realism-glow-7-7.md from a run's JSON (story 7.7), each cell reading
// 1920×1080 / 390×844. The production tables come from prod-stars.mjs, not from here.
//   node spikes/realism-fills/summarize-stars.mjs spikes/realism-fills/results/stars.json
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const NAMES = ['1920x1080@1', '390x844@2'].filter((name) => data[name] !== undefined);
const runs = NAMES.map((name) => data[name]);
const each = (read) => runs.map(read).join(' / ');
const sum = (rows, read) => rows.reduce((total, row) => total + read(row), 0);

console.log('environment:', JSON.stringify(runs[0].environment), 'neutral off ground:', each((run) => run.neutral.offGround));

console.log('\n## Own marks: class | rows | mark px | full px | lost | lost on real | reach | reach on real | rows the shipped fill cannot reach | rows with mark pixels and no comparator control');
for (const [name, test] of [
  ['outline, subject', (row) => row.mark === 'outline' && row.isSubject],
  ['outline, rest', (row) => row.mark === 'outline' && !row.isSubject],
  ['core, subject', (row) => row.mark === 'core' && row.isSubject],
  ['core, rest', (row) => row.mark === 'core' && !row.isSubject],
]) {
  const rows = (run) => run.starOwn.filter(test);
  console.log(`| ${name} | ${each((run) => rows(run).length)} | ${each((run) => sum(rows(run), (r) => r.markPixels))} | ${each((run) => sum(rows(run), (r) => r.fullPixels))} | ${each((run) => sum(rows(run), (r) => r.lost))} | ${each((run) => sum(rows(run), (r) => r.lostOnReal))} | ${each((run) => sum(rows(run), (r) => r.reach))} | ${each((run) => sum(rows(run), (r) => r.reachOnReal))} | ${each((run) => rows(run).filter((r) => r.reach === 0).length)} | ${each((run) => rows(run).filter((r) => r.markPixels > 0 && r.comparatorControl === 0).length)} |`);
}
console.log('rows with reach 0, by largest radius:', each((run) => Math.max(0, ...run.starOwn.filter((r) => r.reach === 0).map((r) => r.radiusPx))));
console.log('rows with reach 0:', JSON.stringify(runs.map((run) => run.starOwn.filter((r) => r.reach === 0).map((r) => `${r.pose.slice(0, 24)} ${r.star} ${r.mark} ${r.radiusPx}px ${r.markPixels}`))));

console.log('\n## Edge: class | Stars | outline radius | largest centre offset | largest edge deviation');
const edgeRows = (run, test) => run.starEdges.flatMap((row) => row.stars.map((star) => ({ pose: row.pose, ...star }))).filter((row) => row.radiusPx !== undefined && test(row.pose));
for (const [name, test] of [['Client stop', (pose) => pose.startsWith('stop')], ['Rail, between stops', (pose) => pose.startsWith('rail')], ['Focus', (pose) => pose.startsWith('focus')]]) {
  const worst = (read) => each((run) => { const rows = edgeRows(run, test); return rows.length === 0 ? 'none' : Math.max(...rows.map(read)).toFixed(2); });
  console.log(`| ${name} | ${each((run) => edgeRows(run, test).length)} | ${each((run) => { const rows = edgeRows(run, test); return rows.length === 0 ? 'none' : `${Math.min(...rows.map((r) => r.radiusPx))} to ${Math.max(...rows.map((r) => r.radiusPx))}`; })} | ${worst((r) => r.centreOffsetPx)} | ${worst((r) => Math.max(Math.abs(r.edgeMax - r.predictedFillPx), Math.abs(r.edgeMin - r.predictedFillPx)))} |`);
}
const large = (run) => edgeRows(run, () => true).filter((row) => row.radiusPx >= 8);
console.log('at radius >= 8px: rows', each((run) => large(run).length), ' largest centre offset', each((run) => Math.max(...large(run).map((r) => r.centreOffsetPx))), ' largest deviation', each((run) => Math.max(...large(run).map((r) => Math.max(Math.abs(r.edgeMax - r.predictedFillPx), Math.abs(r.edgeMin - r.predictedFillPx)))).toFixed(2)), ' any bin empty:', each((run) => large(run).filter((r) => { const [have, of] = r.binsWithEdge.split(' of '); return have !== of; }).length));

console.log('\n## Glow');
const g = (read) => each((run) => read(run.glow));
console.log('poses', g((x) => x.length), ' with a glow', g((x) => x.filter((r) => r.glowsOnScreen > 0).length));
console.log('differing within reach', g((x) => sum(x, (r) => r.differingWithin)), ' outside', g((x) => sum(x, (r) => r.differingOutside)), ' control, enlarged', g((x) => sum(x, (r) => r.controlOutsideEnlarged)));
console.log('the depth test rejected', g((x) => sum(x, (r) => r.depthTestRejected)));
console.log('first draw differed', g((x) => sum(x, (r) => r.firstDrawDiffered)), ' same frame twice', g((x) => sum(x, (r) => r.sameFrameTwiceDiffered)));
console.log('fully covered line pixels in reach', g((x) => sum(x, (r) => r.linePixelsInReach)), ' changed', g((x) => sum(x, (r) => r.lineChanged)), ' control, glow drawn above', g((x) => sum(x, (r) => r.controlLineChanged)));
console.log('edges measured', g((x) => sum(x, (r) => r.edgesMeasured)), ' largest px', g((x) => Math.max(...x.map((r) => r.largestMeasuredPx))), ' beyond the edge', g((x) => sum(x, (r) => r.beyondEdge)), ' at the edge, levels off the ground', g((x) => Math.max(...x.map((r) => r.edgeBandMax))), ' largest neighbour step', g((x) => Math.max(...x.map((r) => r.edgeLargestStep))), ' corners off', g((x) => sum(x, (r) => r.cornersOff)), ' control, no falloff', g((x) => Math.max(...x.map((r) => r.controlBandMax))), g((x) => Math.max(...x.map((r) => r.controlLargestStep))));

console.log('\n## Ceiling');
const c = (read) => each((run) => read(run.starCeiling));
console.log('poses', c((x) => x.poses), ' limits', c((x) => x.limitRest), c((x) => x.limitRisen));
console.log('rest: pixels', c((x) => x.rest.pixels), ' over', c((x) => x.rest.over), ' over with marks drawn', c((x) => x.rest.overWithMarks), ' mark pixels excluded', c((x) => x.rest.markPixelsExcluded), ' peak', c((x) => x.rest.peak), c((x) => x.rest.peakPose));
console.log('risen: pixels', c((x) => x.risen.pixels), ' over', c((x) => x.risen.over), ' over with marks drawn', c((x) => x.risen.overWithMarks), ' mark pixels excluded', c((x) => x.risen.markPixelsExcluded), ' peak', c((x) => x.risen.peak), c((x) => x.risen.peakPose));
console.log('control: poses with a glow', c((x) => x.control.posesWithGlow), ' caught', c((x) => x.control.posesThatCaught), ' glow overdriven over', c((x) => x.control.glowOverdrivenOver), ' fill overdriven over', c((x) => x.control.fillOverdrivenOver));

console.log('\n## Rise');
for (const [at, move] of runs[0].rise.moves.entries()) {
  const rows = runs.map((run) => run.rise.moves[at]);
  console.log(`${move.from} > ${move.to} pace ${move.pace}: subject ${rows.map((r) => r.subjectAfter).join(' / ')}, largest step ${rows.map((r) => r.largestFrameStep).join(' / ')}, stated ${move.statedStep}, frames ${rows.map((r) => r.framesUntilBothArrive).join(' / ')}, arrived ${rows.map((r) => r.arrived).join(' / ')}, others ${rows.map((r) => JSON.stringify(r.otherStarsRise)).join(' / ')}, ends ${rows.map((r) => r.last.map((v) => v.toFixed(3)).join('>')).join(' / ')}, disc ${rows.map((r) => r.radiusPx.join('&')).join(' / ')}px`);
}
console.log('control, a cut:', each((run) => run.rise.control.largestFrameStep), 'stated', runs[0].rise.control.statedStep);
console.log('Focus:', JSON.stringify(runs.map((run) => run.rise.focus)));

console.log('\n## Overlap');
console.log('stops:', JSON.stringify(runs.map((run) => run.overlap.stops.map((s) => [s.pose, s.pixels]))));
console.log('Focus:', JSON.stringify(runs.map((run) => run.overlap.focus)));
console.log('Rail:', JSON.stringify(runs.map((run) => run.overlap.rail)));
console.log('worst:', JSON.stringify(runs.map((run) => run.overlap.worst)));

console.log('\n## Rail, with Star fills');
const r = (read) => each((run) => read(run.starRail));
console.log('frames', r((x) => x.frames), ' overlaps any size', r((x) => x.overlapsAnySize), ' on a disc of 3px+', r((x) => x.overlaps), ' overlap frames', r((x) => x.overlapFrames), ' testable', r((x) => x.testable), ' showing through', r((x) => x.showThrough), ' control', r((x) => x.control.showThrough));
console.log('frames with a line on a disc', r((x) => x.flicker.framesWithLineOnDisc), ' line pixels', r((x) => x.flicker.linePixelsOnDisc), ' changed while the line stayed', r((x) => x.flicker.flipsWhereLineStayed), ' in frames', r((x) => x.flicker.framesWithStayedFlip), ' most in one', r((x) => x.flicker.perFrameMaxStayedFlips), ' control, bias alternating', r((x) => x.flicker.controlAlternatingBias));
console.log('\n## Held on a Star');
for (const [at, row] of runs[0].starHeld.entries()) {
  const rows = runs.map((run) => run.starHeld[at]);
  console.log(`${row.pose} ${row.id}: radius ${rows.map((x) => x.radiusPx).join(' / ')}, line px ${rows.map((x) => x.linePixels).join(' / ')}, always hidden ${rows.map((x) => x.hiddenAlways).join(' / ')}, flipping ${rows.map((x) => x.shownSometimesHiddenSometimes).join(' / ')}, control ${rows.map((x) => x.controlAlternatingBias).join(' / ')}`);
}

console.log('\n## Ceiling, risen control');
console.log('poses with the subject on screen', c((x) => x.risenControl.posesWithSubjectOnScreen), ' caught', c((x) => x.risenControl.posesThatCaught), ' glow over', c((x) => x.risenControl.glowOverdrivenOver), ' fill over', c((x) => x.risenControl.fillOverdrivenOver), ' largest read', c((x) => x.risenControl.largestRead));

console.log('\n## Fall');
for (const [at, row] of runs[0].fall.entries()) {
  const rows = runs.map((run) => run.fall[at]);
  console.log(`${row.star} pace ${row.pace}: first frame ${rows.map((x) => x.firstFrame).join(' / ')}, frames above rest ${rows.map((x) => x.framesAbove).join(' / ')} (${rows.map((x) => x.secondsAbove).join(' / ')} s), to rest ${rows.map((x) => x.framesToRest).join(' / ')}, radius ${rows.map((x) => x.radiusPx).join(' / ')}`);
}

console.log('\n## Crossing');
for (const [at, row] of runs[0].crossing.rows.entries()) {
  const rows = runs.map((run) => run.crossing.rows[at]);
  console.log(`${row.from}>${row.to} from ${row.camera}: frames over rest ${rows.map((x) => x.framesOverRest).join(' / ')}, over risen ${rows.map((x) => x.overRisen).join(' / ')}, peak ${rows.map((x) => x.peak).join(' / ')}, at the crossing ${rows.map((x) => `${x.crossingRise} peak ${x.crossingPeak} over rest ${x.crossingOverRest} over risen ${x.crossingOverRisen} control ${x.controlOverRisen}`).join(' / ')}`);
}

console.log('\n## Glow stack');
console.log(JSON.stringify(runs.map((run) => run.glowStack)));

console.log('\n## Rise, camera moving');
for (const key of ['moves', 'leavingFocus']) {
  for (const [at, row] of runs[0].riseMoving[key].entries()) {
    const rows = runs.map((run) => run.riseMoving[key][at]);
    console.log(`${key} ${row.mode} pace ${row.pace}: largest step ${rows.map((x) => x.largestStep).join(' / ')}, rise step ${rows.map((x) => x.largestRiseStep).join(' / ')}, readings ${rows.map((x) => x.readings).join(' / ')}, at ${rows.map((x) => x.largestAt).join(' / ')}`);
  }
}
