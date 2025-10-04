#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Document, Paragraph, TextRun, AlignmentType, Header, Footer, BorderStyle, convertInchesToTwip, Packer } = require('docx');

// Get input file from command line
const inputFile = process.argv[2];
const duration = process.argv[3];

if (!inputFile || !duration) {
  console.error('Usage: node format-gmr.js <notes-file.txt> <duration-in-minutes>');
  console.log('Example: node format-gmr.js "Stuff You Should Know Podcast - notes.txt" 10');
  process.exit(1);
}

// Setup directories
const projectRoot = __dirname;
const transcriptsDir = path.join(projectRoot, 'transcripts');
const formattedDir = path.join(projectRoot, 'formatted');

if (!fs.existsSync(formattedDir)) {
  fs.mkdirSync(formattedDir);
  console.log('📁 Created formatted/ directory');
}

const inputPath = path.join(transcriptsDir, inputFile);
if (!fs.existsSync(inputPath)) {
  console.error(`❌ File not found: ${inputPath}`);
  process.exit(1);
}

console.log('📄 Reading transcript...');
const content = fs.readFileSync(inputPath, 'utf8');

// Parse the filename for header
const baseFilename = path.basename(inputFile, path.extname(inputFile)).replace(' - notes', '');

// Parse speakers from content
function extractSpeakers(text) {
  const speakerPattern = /\(([^)]+)\)/g;
  const speakers = new Set();
  let match;
  
  while ((match = speakerPattern.exec(text)) !== null) {
    const speaker = match[1];
    if (speaker && !speaker.includes(' ')) {
      speakers.add(speaker);
    }
  }
  
  return Array.from(speakers).sort().join(', ');
}

const speakers = extractSpeakers(content);
console.log(`👥 Detected speakers: ${speakers}`);

// Parse content into segments with speakers
function parseTranscript(text) {
  const segments = [];
  const lines = text.split('\n');
  let currentSpeaker = null;
  let currentText = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if line ends with speaker label in parentheses
    const speakerMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)$/);
    
    if (speakerMatch) {
      // Save previous segment if exists
      if (currentSpeaker && currentText) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      
      // Start new segment
      currentSpeaker = speakerMatch[2];
      currentText = speakerMatch[1];
    } else {
      // Continue current speaker's text
      currentText += ' ' + trimmed;
    }
  }
  
  // Add final segment
  if (currentSpeaker && currentText) {
    segments.push({ speaker: currentSpeaker, text: currentText.trim() });
  }
  
  return segments;
}

const segments = parseTranscript(content);
console.log(`📝 Parsed ${segments.length} speaker segments`);

// Create document
console.log('🔨 Building document...');

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1.25),
          bottom: convertInchesToTwip(1.25),
          left: convertInchesToTwip(0.5),
          right: convertInchesToTwip(0.5),
        },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            text: baseFilename,
            alignment: AlignmentType.CENTER,
            bold: true,
            font: {
              name: 'Times New Roman',
              size: 24,
            },
          }),
          new Paragraph({
            text: speakers,
            alignment: AlignmentType.CENTER,
            bold: true,
            font: {
              name: 'Times New Roman',
              size: 24,
            },
            border: {
              bottom: {
                color: '000000',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            },
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: {
              top: {
                color: '000000',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            },
            children: [
              new TextRun({
                text: 'www.gmrtranscription.com',
                font: {
                  name: 'Times New Roman',
                  size: 24,
                },
                color: '0000FF',
                underline: {},
              }),
              new TextRun({
                text: ' -',
                font: {
                  name: 'Times New Roman',
                  size: 24,
                },
              }),
            ],
          }),
        ],
      }),
    },
    children: [
      // Add all speaker segments
      ...segments.map(segment => 
        new Paragraph({
          alignment: AlignmentType.BOTH,
          children: [
            new TextRun({
              text: segment.speaker + ':\t',
              bold: true,
              font: {
                name: 'Times New Roman',
                size: 24,
              },
            }),
            new TextRun({
              text: segment.text,
              font: {
                name: 'Times New Roman',
                size: 24,
              },
            }),
          ],
        })
      ),
      
      // Add blank line before [End of Audio]
      new Paragraph({
        text: '',
      }),
      
      // Add [End of Audio]
      new Paragraph({
        children: [
          new TextRun({
            text: '[End of Audio]',
            bold: true,
            font: {
              name: 'Times New Roman',
              size: 24,
            },
          }),
        ],
      }),
      
      // Add blank line
      new Paragraph({
        text: '',
      }),
      
      // Add Duration
      new Paragraph({
        children: [
          new TextRun({
            text: `Duration: ${duration} minutes`,
            bold: true,
            font: {
              name: 'Times New Roman',
              size: 24,
            },
          }),
        ],
      }),
    ],
  }],
});

// Write document
const outputFilename = `${baseFilename}.docx`;
const outputPath = path.join(formattedDir, outputFilename);

console.log('💾 Writing document...');

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`\n✅ Document created successfully!`);
  console.log(`📄 Output: ./formatted/${outputFilename}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Open the document in Word/Pages`);
  console.log(`   2. Review for accuracy`);
  console.log(`   3. Check speaker labels are correct`);
  console.log(`   4. Verify formatting matches GMR guidelines`);
  console.log(`   5. Manually replace -- with en-dash where needed`);
}).catch(err => {
  console.error('❌ Error creating document:', err);
  process.exit(1);
});

