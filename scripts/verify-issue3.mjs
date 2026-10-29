// Run with `node scripts/verify-issue3.mjs [http://localhost:3000]`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const load = createRequire(import.meta.url);
const directory = path.dirname(fileURLToPath(import.meta.url));

load.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpile(source, { module: ts.ModuleKind.CommonJS, esModuleInterop: true }), filename);
};
const journal = load('../src/lib/articles.ts');
const issue = load('../src/lib/issue3-articles.json');
const published = journal.getPublishedArticles();
const assets = new Set();
const expectedIds = new Set(issue.map(article => article.id));
assert.equal(issue.length, 22);
assert.equal(journal.getLatestIssue(), 3);
assert.deepEqual(journal.getAvailableIssues(), [3, 2, 1]);
assert.equal(new Set(published.map(article => article.slug)).size, published.length, 'Duplicate public slugs');
assert.equal(new Set(published.map(article => article.id)).size, published.length, 'Duplicate public IDs');
assert.deepEqual(new Set(published.filter(article => article.issue === 3).map(article => article.id)), expectedIds);
for (const rating of ['2', '2+']) {
  assert.equal(journal.isPublicationEligible({ status: 'published', editorialRating: rating }), false);
}
assert.equal(journal.isPublicationEligible({ status: 'published', editorialRating: '3' }), true);
for (const identifier of ['TMD-20261025-202733-4669', 'TMD-20261027-220812-9302', 'TMD-20261028-152737-2956']) {
  assert(!published.some(article => article.id === identifier), 'Rejected writing appears in public feed');
  assert(!fs.existsSync(path.join(directory, '../public/manuscripts/issue-3', identifier)));
  assert(!fs.existsSync(path.join(directory, '../public/images/articles/issue-3', identifier + '.webp')));
}
const always = journal.getAlwaysRecommendedArticles();
assert(always.some(article => article.id === 'TMD-20261022-174030-3823'));
assert(always.some(article => article.author?.toLowerCase() === 'onu'));
assert(!always.some(article => article.issue === 3), 'No Issue 3 rating is over 5');
const selections = new Set();
for (let attempt = 0; attempt < 12; attempt += 1) {
  const featured = journal.getFeaturedArticles();
  assert.equal(featured.length, 8);
  assert.equal(new Set(featured.map(article => article.id)).size, 8);
  assert(featured.every(article => published.some(item => item.id === article.id)));
  selections.add(featured.map(article => article.id).join(','));
}
assert(selections.size > 1, 'Featured selection never changes');
for (const article of issue) {
  assert.equal(journal.getArticleBySlug(article.slug)?.id, article.id);
  assert.match(article.editorialRating, /^[3-5]\+?$/);
  assert(!Object.keys(article).some(key => /email|phone|address/i.test(key)), 'Private submission fields leaked');
  assets.add(article.coverImage);
  assert(article.manuscriptParagraphs?.length > 0, 'Missing real article text');
  assert(!article.manuscriptPages, 'Manuscript images must not replace article text');
  assert(!article.originalFile, 'Do not publish PDF manuscript files');
  assert.deepEqual(article.manuscriptParagraphs.map(paragraph => paragraph.runs.map(run => run.text).join('')), article.content);
}
for (const asset of assets) {
  assert(asset.startsWith('/'), 'Remote asset in Issue 3');
  assert(fs.statSync(path.join(directory, '../public', asset)).size > 0, `Empty asset: ${asset}`);
}
console.log(`Verified 22 eligible writings, ${assets.size} local assets, preserved Always Read, and random distinct Featured selections.`);

async function verifyServer(base) {
  let response = await fetch(base);
  assert.equal(response.status, 200);
  const home = await response.text();
  assert(home.includes('Featured'));
  assert(!home.includes("Today's Feature"));
  assert(home.includes('Always Read'));
  response = await fetch(base + '/archive');
  assert.equal(response.status, 200);
  const archive = await response.text();
  assert(archive.replace(/<!--.*?-->/g, '').includes('Issue 3'));
  for (const article of issue) {
    response = await fetch(base + '/article/' + article.slug);
    assert.equal(response.status, 200, article.slug);
    const html = await response.text();
    assert(html.includes('Published manuscript'));
    assert(html.includes(article.coverImage));
    assert(!html.includes('/manuscripts/issue-3/'), 'Article includes manuscript images or PDF files');
    {
      const escaped = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
      for (const paragraph of article.manuscriptParagraphs) {
        for (const run of paragraph.runs) {
          let expected = escaped(run.text);
          if (run.strike) expected = `<s>${expected}</s>`;
          if (run.verticalAlign === 'super') expected = `<sup>${expected}</sup>`;
          if (run.verticalAlign === 'sub') expected = `<sub>${expected}</sub>`;
          if (run.underline) expected = `<u>${expected}</u>`;
          if (run.italic) expected = `<em>${expected}</em>`;
          if (run.bold) expected = `<strong>${expected}</strong>`;
          assert(html.includes(expected), `Source text or emphasis changed in HTML: ${article.title}`);
        }
      }
    }
  }
  for (const asset of assets) {
    response = await fetch(base + asset);
    assert.equal(response.status, 200, asset);
    if (asset.endsWith('.webp')) assert.match(response.headers.get('content-type'), /image\/webp/);
    await response.arrayBuffer();
  }
  // Check Next's optimizer, which is used for covers on cards and article pages.
  for (const article of issue) {
    response = await fetch(base + '/_next/image?url=' + encodeURIComponent(article.coverImage) + '&w=640&q=75');
    assert.equal(response.status, 200, `Cover optimization failed: ${article.id}`);
    assert.match(response.headers.get('content-type'), /image\//);
    await response.arrayBuffer();
  }
  console.log('HTTP verified: homepage, archive, all 22 article routes, all local assets, and all 22 optimized covers.');
}
if (process.argv[2]) verifyServer(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });
