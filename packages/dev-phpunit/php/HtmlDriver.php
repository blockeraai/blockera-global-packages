<?php

namespace Blockera\Dev\PhpUnit;

use PHPUnit\Framework\Assert;
use Spatie\Snapshots\Drivers\TextDriver;

class HtmlDriver extends TextDriver {

	public function extension(): string {
		return 'html';
	}

	public function serialize( $data ): string {
		$html = parent::serialize( $data );
		$html = PrettifyMarkup::html( (string) $html );
		// $html = preg_replace( '/\bviewbox=/i', 'viewBox=', $html ) ?? $html;

		return $html;
	}

	public function match( $expected, $actual ): void {
		Assert::assertEquals(
			(string) $expected,
			$this->serialize( $actual )
		);
	}
}
