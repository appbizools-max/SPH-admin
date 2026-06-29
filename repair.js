import fs from 'fs';
const path = 'd:/Final/admin-web/src/pages/reception/ReceptionDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings for easier matching
content = content.replace(/\r\n/g, '\n');

const correctEnd = '            </div>\n            </div>\n          </main>\n';
const modalStart = '        {/* Reschedule Modal */}';

const endIdx = content.indexOf(correctEnd);
if (endIdx !== -1) {
    const garbageIdx = content.indexOf('                          </div>', endIdx + correctEnd.length);
    
    if (garbageIdx !== -1) {
        const closingTagStr = '        )}\n';
        const modalRealIdx = content.indexOf(closingTagStr + modalStart, garbageIdx);
        
        if (modalRealIdx !== -1) {
            content = content.substring(0, garbageIdx) + content.substring(modalRealIdx);
            fs.writeFileSync(path, content, 'utf8');
            console.log('✅ File successfully repaired! You can safely delete this repair.js script.');
        } else {
            console.log('Could not find the end of the garbage block.');
        }
    } else {
        console.log('Could not find the start of the garbage block.');
    }
} else {
    console.log('Could not find the correct end of the workspace.');
}
