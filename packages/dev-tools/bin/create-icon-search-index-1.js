/**
 * Build Fuse search index for primary icon libraries (search-index.json).
 */
const { buildIconSearchIndex } = require('./create-icon-search-index-lib');

buildIconSearchIndex({
	librariesFileName: 'search-libraries.json',
	destinationFileName: 'search-index.json',
});
