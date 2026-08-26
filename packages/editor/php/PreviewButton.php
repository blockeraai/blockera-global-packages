<?php

namespace Blockera\Editor;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Preview Button Handler for Blockera.
 *
 * Handles the in-editor preview functionality including:
 * - Hiding the admin bar when previewing in iframe.
 * - Blocking link navigation inside the preview iframe.
 *
 * @package Blockera
 * @since 2.0.0
 */
class PreviewButton {

	/**
	 * Query argument used to identify preview requests that should hide the admin bar.
	 *
	 * @var string
	 */
	const HIDE_ADMIN_BAR_ARG = 'blockera-hide-admin-bar';

	/**
	 * Constructor - Initialize hooks.
	 */
	public function __construct() {
		// Hide admin bar when preview arg is present.
		add_filter( 'show_admin_bar', array( $this, 'maybe_hide_admin_bar' ) );

		// Also hide via body class for extra safety.
		add_filter( 'body_class', array( $this, 'add_preview_body_class' ) );

		// Add inline CSS to ensure admin bar is hidden.
		add_action( 'wp_head', array( $this, 'hide_admin_bar_styles' ), 100 );

		// Report document height to the parent preview overlay (wrapper scrollport).
		add_action( 'wp_footer', array( $this, 'print_height_reporter' ), 1 );

		// Block in-iframe link navigation (preview is display-only).
		add_action( 'wp_footer', array( $this, 'print_navigation_blocker' ), 1 );
	}

	/**
	 * Check if the current request is a Blockera preview iframe request.
	 *
	 * @return bool True if this is a preview request that should hide the admin bar.
	 */
	public function is_preview_iframe_request() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- This is a display-only check.
		return isset( $_GET[ self::HIDE_ADMIN_BAR_ARG ] ) && '1' === $_GET[ self::HIDE_ADMIN_BAR_ARG ];
	}

	/**
	 * Filter callback to hide the admin bar for preview iframe requests.
	 *
	 * @param bool $show_admin_bar Whether to show the admin bar.
	 * @return bool False if this is a preview request, original value otherwise.
	 */
	public function maybe_hide_admin_bar( $show_admin_bar ) {
		if ( $this->is_preview_iframe_request() ) {
			return false;
		}

		return $show_admin_bar;
	}

	/**
	 * Add a body class when viewing in preview iframe.
	 *
	 * @param array $classes Array of body classes.
	 * @return array Modified array of body classes.
	 */
	public function add_preview_body_class( $classes ) {
		if ( $this->is_preview_iframe_request() ) {
			$classes[] = 'blockera-preview-iframe';
		}

		return $classes;
	}

	/**
	 * Output inline CSS to hide admin bar elements for preview iframe.
	 * This is a fallback in case the filter doesn't work in some edge cases.
	 */
	public function hide_admin_bar_styles() {
		if ( ! $this->is_preview_iframe_request() ) {
			return;
		}

		?>
		<style id="blockera-preview-hide-admin-bar">
			#wpadminbar,
			html.wp-toolbar {
				display: none !important;
				margin-top: 0 !important;
				padding-top: 0 !important;
			}
			html {
				margin-top: 0 !important;
			}
			body.admin-bar {
				margin-top: 0 !important;
				padding-top: 0 !important;
			}
		</style>
		<?php
	}

	/**
	 * Post document height to the parent preview overlay so the iframe can grow
	 * and the overlay wrapper becomes the only scrollport.
	 */
	public function print_height_reporter() {
		if ( ! $this->is_preview_iframe_request() ) {
			return;
		}

		?>
		<script id="blockera-preview-height-reporter">
		(function () {
			if (!window.parent || window.parent === window) {
				return;
			}
			var t = null;
			function send() {
				if (t) {
					clearTimeout(t);
				}
				t = setTimeout(function () {
					var body = document.body;
					var root = document.documentElement;
					var height = 0;
					if (body) {
						height = Math.max(body.scrollHeight || 0, body.offsetHeight || 0);
					}
					if (root) {
						height = Math.max(
							height,
							root.scrollHeight || 0,
							root.offsetHeight || 0
						);
					}
					if (height > 0) {
						window.parent.postMessage({ type: 'IFRAME_HEIGHT', height: height }, '*');
					}
				}, 50);
			}
			if (window.ResizeObserver && document.body) {
				new ResizeObserver(send).observe(document.body);
			}
			window.addEventListener('load', send);
			window.addEventListener('resize', send);
			if (document.readyState === 'complete') {
				send();
			} else {
				document.addEventListener('DOMContentLoaded', send);
			}
		})();
		</script>
		<?php
	}

	/**
	 * Prevent link / area navigation inside the preview iframe.
	 * Capture-phase so it runs before theme or Interactivity API handlers.
	 * Does not disable non-navigation UI (for example image lightbox).
	 */
	public function print_navigation_blocker() {
		if ( ! $this->is_preview_iframe_request() ) {
			return;
		}

		?>
		<script id="blockera-preview-navigation-blocker">
		(function () {
			function elementFromEvent(event) {
				var node = event.target;
				if (!node) {
					return null;
				}
				if (node.nodeType === 1) {
					return node;
				}
				return node.parentElement || null;
			}
			function blockNavigation(event) {
				var el = elementFromEvent(event);
				if (!el || !el.closest) {
					return;
				}
				if (!el.closest('a[href], area[href]')) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				if (event.stopImmediatePropagation) {
					event.stopImmediatePropagation();
				}
			}
			document.addEventListener('click', blockNavigation, true);
			document.addEventListener('auxclick', blockNavigation, true);
		})();
		</script>
		<?php
	}
}
