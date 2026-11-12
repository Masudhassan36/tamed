/* eslint-disable @typescript-eslint/no-require-imports -- This Node harness registers CommonJS TS/TSX loaders to exercise the real server renderer. */
// Verify publication eligibility and text/style fidelity through the real renderer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.resolve(__dirname, '../src', name.slice(2)) : name, ...args);
};
for (const extension of ['.ts', '.tsx']) {
  Module._extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
}
const {renderToStaticMarkup} = require('react-dom/server');
const {createElement} = require('react');
const ArticleBody = require('../src/components/ArticleBody.tsx').default;
const journal = require('../src/lib/articles.ts');
const issue = require('../src/lib/issue5-articles.json');
const formats = require('../src/lib/manuscript-formats.json');
const published = journal.getPublishedArticles();
const decode = html => html.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const runs = blocks => blocks.flatMap(block => block.table ? block.table.flatMap(row => row.flatMap(cell => runs(cell))) : block.runs);
assert.equal(journal.getLatestIssue(), 5);
assert.deepEqual(journal.getAvailableIssues(), [5, 4, 3, 2, 1]);
assert.equal(issue.length, 23);
assert.equal(new Set(published.map(a => a.id)).size, published.length);
assert.equal(new Set(published.map(a => a.slug)).size, published.length);
for (const id of ['TMD-20261109-191707-1600', 'TMD-20261111-195514-2425']) {
  assert(!published.some(a => a.id === id), 'Excluded manuscript published');
  assert(!fs.existsSync(path.join(__dirname, '../public/images/articles/issue-5', id + '.webp')));
}
for (const article of issue) {
  assert.match(article.editorialRating, /^[3-5]\+?$/);
  assert.equal(article.publishedAt, '2026-11-12');
  assert(fs.statSync(path.join(__dirname, '../public', article.coverImage)).size > 0);
  assert(!Object.keys(article).some(k => /email|phone|address/i.test(k)));
  assert(article.manuscriptParagraphs.length);
}
for (const article of published.filter(a => a.manuscriptParagraphs?.length)) {
  const source = runs(article.manuscriptParagraphs);
  const html = renderToStaticMarkup(createElement(ArticleBody, {article}));
  assert.equal(decode(html), source.map(r => r.text).join(''), 'Rendered text changed: ' + article.id);
  assert.equal((html.match(/class="manuscript-run"/g) || []).length, source.length);
  for (const run of source) {
    if (run.fontSize !== undefined) assert(html.includes(`font-size:${run.fontSize}pt`), article.id);
    if (run.fontFamily) assert(html.includes(run.fontFamily.replaceAll('"', '')), article.id);
  }
  if (article.manuscriptParagraphs.some(b => b.table)) assert(html.includes('<table'));
}
for (const [id, blocks] of Object.entries(formats)) {
  assert.deepEqual(published.find(a => a.id === id)?.manuscriptParagraphs, blocks);
}
const fixture = {...issue[0], manuscriptParagraphs: [
  {runs: [{text: '  First\tline\nsecond line  ', fontFamily: 'Times New Roman', fontSize: 12, bold: true, italic: true, underline: true}], spaceAfter: 0},
  {runs: []},
  {runs: [{text: 'Last line'}]},
]};
const html = renderToStaticMarkup(createElement(ArticleBody, {article: fixture}));
assert(html.includes('  First\tline\nsecond line  '));
assert(html.includes('<strong><em><u>'));
assert(html.includes('<br/>'));
console.log(`Verified ${issue.length} Issue 5 writings, ${Object.keys(formats).length} restored earlier manuscripts, exact rendered text, font declarations, blank lines, and tables. Total published: ${published.length}.`);

async function httpCheck(base) {
  for (const route of ['/', '/archive', ...issue.map(a => '/article/' + a.slug)]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    if (route === '/' || route === '/archive') assert(html.replace(/<!--.*?-->/g, '').includes('Issue 5'), route);
    else assert(html.includes('Published manuscript'), route);
  }
  for (const article of issue) {
    const response = await fetch(base + article.coverImage);
    assert.equal(response.status, 200, article.coverImage);
    assert.match(response.headers.get('content-type'), /image\/webp/);
  }
  console.log('HTTP verified homepage, archive, all 23 Issue 5 articles, and all 23 covers.');
}
if (process.argv[2]) httpCheck(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });
