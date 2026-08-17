/**
 * Build Fuse search index for secondary icon libraries (search-index-2.json).
 *
 * @deprecated Prefer `node create-icon-search-index.js --index 2`.
 */
const { buildIconSearchIndex } = require('./create-icon-search-index-lib');

buildIconSearchIndex({
	librariesFileName: 'search-libraries-2.json',
	destinationFileName: 'search-index-2.json',
});
