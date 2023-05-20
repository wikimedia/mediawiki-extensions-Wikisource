<?php

namespace MediaWiki\Extension\Wikisource;

use MediaWiki\MediaWikiServices;
use PHPUnit\Framework\TestCase;
use Title;

/**
 * @covers \MediaWiki\Extension\Wikisource\WsExport
 *
 * @group Wikisource
 */
class WsExportTest extends TestCase {

	/**
	 * @dataProvider provideServerName
	 */
	public function testServerName( $langCode, $serverName, $exportUrl ) {
		$lang = MediaWikiServices::getInstance()->getLanguageFactory()->getLanguage( $langCode );
		$wsExport = new WsExport( $lang, 'exportUrl', $serverName );
		$this->assertSame( $exportUrl, $wsExport->getExportUrl( Title::newFromText( 'Lorem' ) ) );
	}

	public static function provideServerName() {
		return [
			[ 'ru', 'localhost', 'exportUrl/?lang=ru&title=Lorem' ],
			[ 'en', 'en.wikisource.org', 'exportUrl/?lang=en&title=Lorem' ],
			[ 'en', 'wikisource.org', 'exportUrl/?lang=mul&title=Lorem' ],
			[ 'pt-br', 'foo.example.com', 'exportUrl/?lang=pt-br&title=Lorem' ],
			[ 'en', 'en.wikisource.beta.wmflabs.org', 'exportUrl/?lang=beta&title=Lorem' ],
		];
	}
}
