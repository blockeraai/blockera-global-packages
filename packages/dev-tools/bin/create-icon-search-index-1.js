/**
 * Build Fuse search index for primary icon libraries (search-index.json).
 *
 * @deprecated Prefer `node create-icon-search-index.js --index 1`.
 */
const { buildIconSearchIndex } = require('./create-icon-search-index-lib');

buildIconSearchIndex({
	librariesFileName: 'search-libraries.json',
	destinationFileName: 'search-index.json',
});
