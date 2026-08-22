<?php
/**
 * WordPress PHPUnit bootstrap hook for the global-packages monorepo.
 *
 * Consumer bootstraps load product entry files here. This repo only runs
 * shared-package unit tests (no plugin/theme boot).
 *
 * @package blockera/global-packages
 */

define( 'BLOCKERA_SB_TESTING', true );
