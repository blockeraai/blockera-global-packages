<?php
/**
 * Cypress fixture: PHP-registered pattern for inspector inner-block coverage.
 *
 * Registers a plugin pattern (and a matching synced wp_block) whose markup is a
 * content-only section wrapping Query Loop → linked Post Title. Tests enter
 * core's inline "Edit pattern" mode, select Title, then a Blockera inner block.
 *
 * @package Blockera
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pattern slug (post_name) used by the Cypress spec and register_block_pattern.
 */
const BLOCKERA_E2E_PATTERN_INSPECTOR_SLUG = 'blockera-e2e-pattern-inspector';

/**
 * Pattern name passed to register_block_pattern().
 */
const BLOCKERA_E2E_PATTERN_INSPECTOR_NAME = 'blockera/e2e-pattern-inspector';

/**
 * Markup: content-only section + Query loop + linked post title (Links inner block).
 *
 * `templateLock: contentOnly` is what makes Gutenberg show inspector
 * "Edit pattern" / "Exit pattern" (see block-inspector/edit-contents.js).
 *
 * @return string
 */
function blockera_e2e_pattern_inspector_content() {
	return '<!-- wp:group {"metadata":{"name":"Blockera E2E Pattern Inspector","patternName":"blockera/e2e-pattern-inspector"},"templateLock":"contentOnly","layout":{"type":"constrained"}} -->
<div class="wp-block-group"><!-- wp:query {"query":{"perPage":1,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":false}} -->
<div class="wp-block-query"><!-- wp:post-template -->
<!-- wp:post-title {"isLink":true} /-->
<!-- /wp:post-template --></div>
<!-- /wp:query --></div>
<!-- /wp:group -->';
}

/**
 * Register the pattern so the editor pattern API can resolve it by name.
 *
 * @return void
 */
function blockera_e2e_register_pattern_inspector() {
	register_block_pattern(
		BLOCKERA_E2E_PATTERN_INSPECTOR_NAME,
		array(
			'title'      => 'Blockera E2E Pattern Inspector',
			'categories' => array( 'featured' ),
			'content'    => blockera_e2e_pattern_inspector_content(),
		)
	);
}

/**
 * Insert a synced wp_block once so REST can also resolve the fixture by slug.
 *
 * @return void
 */
function blockera_e2e_ensure_pattern_inspector_fixture() {
	$existing = get_page_by_path(
		BLOCKERA_E2E_PATTERN_INSPECTOR_SLUG,
		OBJECT,
		'wp_block'
	);

	$content = blockera_e2e_pattern_inspector_content();

	if ( $existing instanceof WP_Post ) {
		if ( $existing->post_content !== $content ) {
			wp_update_post(
				array(
					'ID'           => (int) $existing->ID,
					'post_content' => $content,
					'post_status'  => 'publish',
				)
			);
		}

		update_option( 'blockera_e2e_pattern_inspector_id', (int) $existing->ID );

		return;
	}

	$id = wp_insert_post(
		array(
			'post_title'   => 'Blockera E2E Pattern Inspector',
			'post_name'    => BLOCKERA_E2E_PATTERN_INSPECTOR_SLUG,
			'post_content' => $content,
			'post_status'  => 'publish',
			'post_type'    => 'wp_block',
			'post_author'  => 1,
		),
		true
	);

	if ( ! is_wp_error( $id ) ) {
		update_option( 'blockera_e2e_pattern_inspector_id', (int) $id );
	}
}

add_action( 'init', 'blockera_e2e_register_pattern_inspector', 20 );
add_action( 'init', 'blockera_e2e_ensure_pattern_inspector_fixture', 21 );
