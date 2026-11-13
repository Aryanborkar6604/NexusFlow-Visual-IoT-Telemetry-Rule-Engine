import { validateWorkflowGraph } from '../src/compiler/dagValidator.js';
import { compileWorkflow } from '../src/compiler/streamCompiler.js';
import { Subject } from 'rxjs';

console.log('🧪 Starting NexusFlow Stream Compiler Test Suite...\n');

// Test 1: Cycle Detection
console.log('Test 1: Cycle Detection');
const cyclicWorkflow = {
  id: 'wf_cycle',
  nodes: [
    { id: 'n1', type: 'sensor', data: { deviceId: 'TURBINE_001', field: 'temperature' } },
    { id: 'n2', type: 'movingAverage', data: { windowSize: 5 } },
  ],
  edges: [
    { source: 'n1', target: 'n2' },
    { source: 'n2', target: 'n1' }, // Cycle!
  ],
};

try {
  validateWorkflowGraph(cyclicWorkflow);
  console.error('❌ FAILED: Cyclic graph was not rejected!');
  process.exit(1);
} catch (err) {
  console.log(`✅ PASSED: Cycle correctly detected & rejected: "${err.message}"`);
}

// Test 2: Disconnected Node Detection
console.log('\nTest 2: Disconnected Node Detection');
const disconnectedWorkflow = {
  id: 'wf_discon',
  nodes: [
    { id: 'n1', type: 'sensor', data: { deviceId: 'TURBINE_001', field: 'temperature' } },
    { id: 'n2', type: 'condition', data: { operator: '>', value: 80 } }, // Disconnected!
  ],
  edges: [],
};

try {
  validateWorkflowGraph(disconnectedWorkflow);
  console.error('❌ FAILED: Disconnected condition was not rejected!');
  process.exit(1);
} catch (err) {
  console.log(`✅ PASSED: Disconnected condition correctly rejected: "${err.message}"`);
}

// Test 3: End-to-End RxJS Execution
console.log('\nTest 3: RxJS Pipeline Compilation & Execution');
const validWorkflow = {
  id: 'wf_turbine_01',
  name: 'Turbine Temp Monitor',
  nodes: [
    { id: 's1', type: 'sensor', data: { deviceId: 'TURBINE_001', field: 'temperature' } },
    { id: 'm1', type: 'movingAverage', data: { windowSize: 3 } },
    { id: 'c1', type: 'condition', data: { operator: '>', value: 80 } },
    { id: 'a1', type: 'sms', data: { recipient: '+15550199', message: 'Spike: {{value}}' } },
  ],
  edges: [
    { source: 's1', target: 'm1' },
    { source: 'm1', target: 'c1' },
    { source: 'c1', target: 'a1' },
  ],
};

let alertDispatched = null;
const nodeStatusEvents = [];

const context = {
  dispatchAlert: (payload) => {
    alertDispatched = payload;
  },
  emitNodeStatus: (status) => {
    nodeStatusEvents.push(status);
  },
};

const pipeline = compileWorkflow(validWorkflow, context);
const testSource$ = new Subject();

// Subscribe
const sub = pipeline(testSource$).subscribe();

// Feed readings
// Reading 1: 70°C (Avg: 70, Condition false -> no alert)
testSource$.next({ temperature: 70 });
// Reading 2: 75°C (Avg: 72.5, Condition false -> no alert)
testSource$.next({ temperature: 75 });
// Reading 3: 82°C (Avg: (70+75+82)/3 = 75.7, Condition false -> no alert)
testSource$.next({ temperature: 82 });

if (alertDispatched !== null) {
  console.error('❌ FAILED: Alert fired prematurely before moving average threshold exceeded!');
  process.exit(1);
}
console.log('✅ Readings 1-3 processed smoothly without premature alert.');

// Reading 4: 95°C (Avg: (75+82+95)/3 = 84.0 > 80 -> Alert SHOULD fire!)
testSource$.next({ temperature: 95 });

if (!alertDispatched) {
  console.error('❌ FAILED: Alert did not fire when 3-sample average exceeded 80°C!');
  process.exit(1);
}

console.log(`✅ PASSED: Alert successfully fired with calculated moving average: ${alertDispatched.value}°C`);
console.log(`✅ Total node status tracking events captured: ${nodeStatusEvents.length}`);

sub.unsubscribe();
console.log('\n🎉 ALL COMPILER & PIPELINE TESTS PASSED 100%!');
