<?php

namespace Blockera\Admin\Tests;

use Blockera\Setup\Blockera;
use Blockera\Admin\Providers\AdminAssetsProvider;

class AdminAssetsProviderTest extends \Blockera\Dev\PHPUnit\AppTestCase {

	public function testInlineScriptDefaultBreakpointsIgnoreSavedCustomizations(): void {

		$options = blockera_get_admin_options();
		$options['general']['breakpoints']['tablet']['settings']['min'] = '768px';
		$options['general']['breakpoints']['tablet']['settings']['max'] = '1024px';
		update_option( 'blockera_settings', $options );

		$provider = new AdminAssetsProvider( Blockera::getInstance() );
		$script   = $provider->createInlineScript( '' );

		$defaults_marker = 'window.blockeraDefaultSettings = ';
		$settings_marker = 'window.blockeraSettings = ';
		$version_marker  = 'window.blockeraVersion = ';

		$defaults_start = strpos( $script, $defaults_marker );
		$settings_start = strpos( $script, $settings_marker );
		$version_start  = strpos( $script, $version_marker );

		$this->assertNotFalse( $defaults_start );
		$this->assertNotFalse( $settings_start );
		$this->assertNotFalse( $version_start );
		$this->assertGreaterThan( $defaults_start, $settings_start );
		$this->assertGreaterThan( $settings_start, $version_start );

		$defaults_json = rtrim(
			substr(
				$script,
				$defaults_start + strlen( $defaults_marker ),
				$settings_start - $defaults_start - strlen( $defaults_marker )
			),
			"; \n\r\t"
		);
		$settings_json = rtrim(
			substr(
				$script,
				$settings_start + strlen( $settings_marker ),
				$version_start - $settings_start - strlen( $settings_marker )
			),
			"; \n\r\t"
		);

		$defaults = json_decode( $defaults_json, true );
		$settings = json_decode( $settings_json, true );

		$this->assertIsArray( $defaults );
		$this->assertIsArray( $settings );
		$this->assertSame( '', $defaults['general']['breakpoints']['tablet']['settings']['min'] );
		$this->assertSame( '991px', $defaults['general']['breakpoints']['tablet']['settings']['max'] );
		$this->assertSame( '768px', $settings['general']['breakpoints']['tablet']['settings']['min'] );
		$this->assertSame( '1024px', $settings['general']['breakpoints']['tablet']['settings']['max'] );
	}
}
