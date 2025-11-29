import multer from "multer";
import path from "path"
import { fileURLToPath } from 'url';
import fs from "fs"

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// creates a temporary dir
const tempDir = path.join(__dirname, '../public/temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.originalname + "_" + uniqueSuffix)
    }
})

export const upload = multer({ storage: storage })