<?php
/**
 * Static serialized Gutenberg markup for preview-mode click navigation e2e.
 *
 * Covers core blocks that render <a href> on the frontend: paragraph link, linked
 * image, button, and featured image (permalink wrap via isLink + first image).
 */

return <<<'HTML'
<!-- wp:paragraph {"className":"blockera-e2e-preview-nav-fixture"} -->
<p class="blockera-e2e-preview-nav-fixture">Blockera e2e preview paragraph <a class="blockera-e2e-preview-paragraph-link" href="https://example.com/blockera-e2e-preview-paragraph">link</a>.</p>
<!-- /wp:paragraph -->

<!-- wp:image {"linkDestination":"custom","className":"blockera-e2e-preview-linked-image"} -->
<figure class="wp-block-image blockera-e2e-preview-linked-image"><a href="https://example.com/blockera-e2e-preview-image"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Blockera e2e preview linked image"/></a></figure>
<!-- /wp:image -->

<!-- wp:buttons -->
<!-- wp:button {"className":"blockera-e2e-preview-button"} -->
<div class="wp-block-button blockera-e2e-preview-button"><a class="wp-block-button__link wp-element-button blockera-e2e-preview-button-link" href="https://example.com/blockera-e2e-preview-button">Blockera e2e preview button</a></div>
<!-- /wp:button -->
<!-- /wp:buttons -->

<!-- wp:post-featured-image {"isLink":true,"useFirstImageFromPost":true,"className":"blockera-e2e-preview-featured-image"} /-->
HTML;
