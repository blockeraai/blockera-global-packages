<?php
/**
 * Static serialized Gutenberg markup for canvas / preview scrollbar e2e.
 *
 * Uses core/html with an explicit pixel height so theme typography and spacing
 * cannot shrink the document below a scrollable size.
 */

return <<<'HTML'
<!-- wp:html -->
<div data-test="blockera-e2e-tall-scroll-fixture" style="min-height:8000px;height:8000px;box-sizing:border-box;background:#e8e8e8">Blockera e2e tall scroll fixture</div>
<!-- /wp:html -->
HTML;
