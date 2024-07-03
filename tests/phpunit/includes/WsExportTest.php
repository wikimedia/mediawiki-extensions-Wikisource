<?php

namespace MediaWiki\Extension\Wikisource;

use MediaWiki\Title\Title;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\Wikisource\WsExport
 *
 * @group Wikisource
 */
class WsExportTest extends MediaWikiIntegrationTestCase {

	/**
	 * @dataProvider provideServerName
	 */
	public function testServerName( $langCode, $serverName, $exportUrl ) {
		$lang = $this->getServiceContainer()->getLanguageFactory()->getLanguage( $langCode );
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
