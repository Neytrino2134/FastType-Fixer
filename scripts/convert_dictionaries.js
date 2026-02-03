import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, '../public/dictionaries/ru');
const OUTPUT_FILE = path.join(INPUT_DIR, 'dictionary.json');

const convert = () => {
  console.log('🔄 Начинаю конвертацию словарей...');

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Папка не найдена: ${INPUT_DIR}`);
    return;
  }

  const files = fs.readdirSync(INPUT_DIR).filter(file => file.endsWith('.csv') || file.endsWith('.txt'));
  
  if (files.length === 0) {
    console.warn('⚠️ CSV файлы не найдены в папке.');
    return;
  }

  const uniqueWords = new Set();
  const cyrillicPattern = /[а-яё]+/i;

  files.forEach(file => {
    const filePath = path.join(INPUT_DIR, file);
    console.log(`📄 Обработка файла: ${file}`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      let fileCount = 0;

      lines.forEach((line, index) => {
        if (!line.trim()) return;

        // Skip obvious headers (like the one in your example)
        if (line.startsWith('bare') || line.includes('translations_en')) return;

        // Logic: Split by Tab, Comma, or Semicolon and take the 0th element
        // Your example suggests Tab-separated values (TSV)
        const parts = line.split(/[\t,;]/); 
        let word = parts[0];

        // Fallback: If split failed and word is huge, maybe it was space separated?
        if (word.includes(' ')) {
            word = word.split(' ')[0];
        }

        // Clean: lowercase, remove non-word chars
        word = word.toLowerCase().trim();

        // Validate: Must contain Russian letters and be > 1 char
        if (word.length > 1 && cyrillicPattern.test(word)) {
          // Extra cleanup: sometimes quotes or accents remain
          word = word.replace(/['"`]/g, ''); 
          
          uniqueWords.add(word);
          fileCount++;
        }
      });
      
      console.log(`   ✅ Добавлено слов: ${fileCount}`);

    } catch (err) {
      console.error(`   ❌ Ошибка чтения файла ${file}:`, err);
    }
  });

  // Convert Set to Array and sort alphabetically
  const sortedWords = Array.from(uniqueWords).sort();
  
  // Write JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedWords, null, 0), 'utf-8'); // Using 0 indent for smallest file size

  console.log('-----------------------------------');
  console.log(`🎉 Успешно! Создан файл: dictionary.json`);
  console.log(`📚 Всего слов в базе: ${sortedWords.length}`);
};

convert();