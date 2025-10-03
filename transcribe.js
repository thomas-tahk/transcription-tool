#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Setup directories
const projectRoot = __dirname;
const audioDir = path.join(projectRoot, 'audio');
const transcriptsDir = path.join(projectRoot, 'transcripts');

// Create directories if they don't exist
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir);
  console.log('📁 Created audio/ directory');
}

if (!fs.existsSync(transcriptsDir)) {
  fs.mkdirSync(transcriptsDir);
  console.log('📁 Created transcripts/ directory');
}

// Get the audio file name from command line arguments
const audioFileName = process.argv[2];

if (!audioFileName) {
  console.error('❌ Error: Please provide an audio file name');
  console.log('\nUsage: node transcribe.js <audio-filename>');
  console.log('Example: node transcribe.js my-audio.mp3');
  console.log('\n📁 Place your audio files in the ./audio/ folder');
  console.log('📄 Transcripts will be saved to ./transcripts/ folder\n');
  process.exit(1);
}

// Build full path to audio file
const audioFile = path.join(audioDir, audioFileName);

// Check if file exists
if (!fs.existsSync(audioFile)) {
  console.error(`❌ Error: File not found: ${audioFile}`);
  console.log('\n💡 Make sure your audio file is in the ./audio/ folder');
  
  // List available files
  const files = fs.readdirSync(audioDir).filter(f => !f.startsWith('.'));
  if (files.length > 0) {
    console.log('\nAvailable files in ./audio/:');
    files.forEach(f => console.log(`  - ${f}`));
  } else {
    console.log('\n📁 The ./audio/ folder is empty. Add your audio files there first.');
  }
  console.log();
  process.exit(1);
}

// Get file info
const fileName = path.basename(audioFile, path.extname(audioFile));

console.log('🎙️  Starting transcription...');
console.log(`📁 Input: ./audio/${audioFileName}`);
console.log(`📄 Output: ./transcripts/${fileName}.txt`);
console.log(`⏳ This may take a few minutes depending on file length...\n`);

// Whisper command with options:
// --model medium: Good balance of speed and accuracy (you can use 'large' for best accuracy)
// --language English: Specify English language
// --task transcribe: Transcribe the audio
// --output_format all: Save in all available formats (txt, srt, vtt, json, tsv)
// --output_dir: Where to save the output
// Note: First run will download the model (~1.5GB for medium)
const whisperCommand = `whisper "${audioFile}" --model medium --language English --task transcribe --output_format all --output_dir "${transcriptsDir}"`;

// Execute Whisper
exec(whisperCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Transcription failed:', error.message);
    return;
  }
  
  if (stderr) {
    console.log(stderr);
  }
  
  console.log(stdout);
  console.log(`\n✅ Transcription complete!`);
  console.log(`📄 Text output: ./transcripts/${fileName}.txt`);
  console.log(`⏱️  Timestamped output: ./transcripts/${fileName}.srt`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the .txt file for accuracy`);
  console.log(`   2. Use the .srt file to find timestamps for [inaudible] marks`);
  console.log(`   3. Add speaker labels (Interviewer/Interviewee or actual names)`);
  console.log(`   4. Apply GMR formatting from guidelines/ folder`);
});