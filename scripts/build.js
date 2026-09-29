import fs from 'fs';
import path from 'path';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '..', 'src');
const OUT_DIR = path.join(__dirname, '..', 'dist');
const PAGES_FILE = path.join(SRC_DIR, 'pages.json');
const I18N_DIR = path.join(SRC_DIR, 'i18n');

const LANGUAGES = ['pt', 'en', 'es'];
const DEFAULT_LANG = 'pt';

console.log(`🔍 DEBUG BUILD.JS`);
console.log(`__dirname = ${__dirname}`);
console.log(`SRC_DIR = ${SRC_DIR}`);
console.log(`OUT_DIR = ${OUT_DIR}`);

// SEO metadata per page
const META = {
home: {
pt: ['Azuton | Comunicação Unificada em Nuvem', 'Soluções de PABX Virtual, Voz IA e Integrações para empresas brasileiras. Tecnologia em nuvem com segurança.'],
en: ['Azuton | Unified Communications in the Cloud', 'Virtual PBX, AI Voice and Integration solutions for Brazilian companies. Cloud technology with security.'],
es: ['Azuton | Comunicaciones Unificadas en la Nube', 'Soluciones de PBX Virtual, Voz IA e Integraciones para empresas brasileñas. Tecnología en nube con seguridad.'],
},
'revenda-pabx-nuvem': {
pt: ['PABX em Nuvem para Revendedores | Azuton', 'Plataforma de PABX Virtual escalável para revendedores. Comissões competitivas, suporte técnico e ferramentas de gestão.'],
en: ['Cloud PBX for Resellers | Azuton', 'Scalable Virtual PBX platform for resellers. Competitive commissions, technical support and management tools.'],
es: ['PBX en la Nube para Revendedores | Azuton', 'Plataforma de PBX Virtual escalable para revendedores. Comisiones competitivas, soporte técnico y herramientas de gestión.'],
},
blog: {
pt: ['Blog Azuton — Tendências em Comunicação Unificada', 'Tendências, estudos e estratégias em comunicação unificada para empresas. Insights sobre PABX, VoIP e transformação digital.'],
en: ['Azuton Blog — Trends in Unified Communications', 'Trends, studies and strategies in unified communications for business. Insights on PBX, VoIP and digital transformation.'],
es: ['Blog Azuton — Tendencias en Comunicaciones Unificadas', 'Tendencias, estudios y estrategias en comunicaciones unificadas para empresas. Perspectivas sobre PBX, VoIP y transformación digital.'],
},
contato: {
pt: ['Contato | Azuton', 'Entre em contato com a Azuton. Suporte ao cliente, informações sobre produtos e parcerias.'],
en: ['Contact | Azuton', 'Get in touch with Azuton. Customer support, product information and partnerships.'],
es: ['Contacto | Azuton', 'Ponte en contacto con Azuton. Soporte al cliente, información de productos y asociaciones.'],
},
};

const loadI18n = (lang) => {
const file = lang === DEFAULT_LANG ? 'index.json' : `index.${lang}.json`;
const filePath = path.join(I18N_DIR, file);
try {
return JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (err) {
console.error(`Error loading i18n for ${lang}:`, err.message);
return {};
}
};

const loadBlogI18n = (lang) => {
const file = lang === DEFAULT_LANG ? 'blog.json' : `blog.${lang}.json`;
const filePath = path.join(I18N_DIR, file);
try {
return JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (err) {
console.error(`Error loading blog i18n for ${lang}:`, err.message);
return {};
}
};

const injectI18n = (html, translations) => {
let result = html;
for (const [key, value] of Object.entries(translations.text || {})) {
const placeholder = `{{${key}}}`;
result = result.split(placeholder).join(value);
}
return result;
};

const injectMeta = (html, title, description) => {
let result = html;
result = result.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
result = result.replace(/content="[^"]*"\s*name="description"/i, `content="${description}" name="description"`);
return result;
};

const copyFolderSync = (src, dest) => {
if (!fs.existsSync(src)) {
console.warn(`Folder not found: ${src}`);
return;
}

if (!fs.existsSync(dest)) {
fs.mkdirSync(dest, { recursive: true });
}

const files = fs.readdirSync(src);
files.forEach(file => {
const srcPath = path.join(src, file);
const destPath = path.join(dest, file);

if (fs.statSync(srcPath).isDirectory()) {
copyFolderSync(srcPath, destPath);
} else {
fs.copyFileSync(srcPath, destPath);
}
});
};

// Template HTML completo com head e meta tags
const createFullHtmlTemplate = (bodyContent, title, description, lang) => {
return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${description}">
<title>${title}</title>
<link rel="stylesheet" href="/css/core.css">
<link rel="stylesheet" href="/css/index.css">
</head>
<body>
${bodyContent}
<script src="/js/form.js"></script>
<script src="/js/blog-filters.js"></script>
</body>
</html>`;
};

const build = () => {
const pages = JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8'));

// Create output directory
if (!fs.existsSync(OUT_DIR)) {
console.log(`Creating OUT_DIR: ${OUT_DIR}`);
fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log(`✓ Copying CSS and JS folders...`);
copyFolderSync(path.join(SRC_DIR, 'styles'), path.join(OUT_DIR, 'css'));
copyFolderSync(path.join(SRC_DIR, 'js'), path.join(OUT_DIR, 'js'));
console.log(`✓ CSS and JS copied`);

pages.forEach((page) => {
const pagePath = path.join(SRC_DIR, 'pages', `${page.file}.html`);
if (!fs.existsSync(pagePath)) {
console.warn(`Page file not found: ${pagePath}`);
return;
}

const baseHtml = fs.readFileSync(pagePath, 'utf8');
let slug = page.slug;

// FIX: Se slug for vazia ou "home", trata como index
if (!slug || slug === 'home') {
slug = 'index';
}

const meta = META[page.slug] || META.home;

LANGUAGES.forEach((lang) => {
const i18n = page.slug === 'blog' ? loadBlogI18n(lang) : loadI18n(lang);
let bodyContent = injectI18n(baseHtml, i18n);

const [title, description] = meta[lang];

// Create full HTML with head and body
const fullHtml = createFullHtmlTemplate(bodyContent, title, description, lang);

// Inject meta tags
const html = injectMeta(fullHtml, title, description);

// Create language-specific directory
const langDir = lang === DEFAULT_LANG ? OUT_DIR : path.join(OUT_DIR, lang);
if (!fs.existsSync(langDir)) {
fs.mkdirSync(langDir, { recursive: true });
}

// Para home, salva como index.html na raiz do lang
// Para outras páginas, cria uma pasta com index.html dentro
let outPath;
if (slug === 'index') {
outPath = path.join(langDir, 'index.html');
} else {
const pageDir = path.join(langDir, slug);
if (!fs.existsSync(pageDir)) {
fs.mkdirSync(pageDir, { recursive: true });
}
outPath = path.join(pageDir, 'index.html');
}

fs.writeFileSync(outPath, html, 'utf8');
});
});

// Count pages and verify
const htmlFiles = fs.readdirSync(OUT_DIR, { recursive: true }).filter(f => f.endsWith('.html'));
console.log(`✓ Build complete: ${htmlFiles.length} pages generated`);
console.log(`OUT_DIR exists? ${fs.existsSync(OUT_DIR)}`);
console.log(`index.html exists? ${fs.existsSync(path.join(OUT_DIR, 'index.html'))}`);
console.log(`css folder exists? ${fs.existsSync(path.join(OUT_DIR, 'css'))}`);
console.log(`js folder exists? ${fs.existsSync(path.join(OUT_DIR, 'js'))}`);
};

build();
