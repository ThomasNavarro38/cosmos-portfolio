import { ResumeSchema } from './src/schemas/resumeSchema';
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const data = JSON.parse(readFileSync(join(process.cwd(), 'public/resume.json'), 'utf8'));
  ResumeSchema.parse(data);
  console.log('✅ Validation Success: Valid JSON data matches schema.');
} catch (error) {
  console.error('❌ Validation Failed:', error);
  process.exit(1);
}

// Test failure
try {
  ResumeSchema.parse({ contact: { name: "Missing fields" } });
  console.error('❌ Test Failure: Schema should have rejected invalid data.');
  process.exit(1);
} catch (error) {
  console.log('✅ Validation Success: Schema correctly rejected invalid data.');
}
