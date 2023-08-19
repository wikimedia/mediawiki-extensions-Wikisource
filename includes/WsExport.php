<?php

namespace MediaWiki\Extension\Wikisource;

use Language;
use MediaWiki\Title\Title;

class WsExport {

	/** @var string Language code (Wikisource subdomain). */
	private $lang;

	/** @var string Base URL for the WS Export tool. */
	private $wsExportUrl;

	/**
	 * @param Language $contentLanguage
	 * @param string $wsExportUrl
	 * @param string $serverName
	 */
	public function __construct( Language $contentLanguage, string $wsExportUrl, string $serverName ) {
		// Get the language code.
		// This logic is duplicated for the frontend in modules/ext.wikisource.ChooserButton.js
		$this->lang = $contentLanguage->getCode();
		$wikisourcePos = strpos( $serverName, '.wikisource.org' );
		if ( $serverName === 'wikisource.org' ) {
			$this->lang = 'mul';
		} elseif ( strpos( $serverName, 'en.wikisource.beta' ) !== false ) {
			$this->lang = 'beta';
		} elseif ( $wikisourcePos !== false ) {
			$this->lang = substr( $serverName, 0, $wikisourcePos );
		}
		$this->wsExportUrl = $wsExportUrl;
	}

	/**
	 * @return string
	 */
	public function getBaseUrl(): string {
		return $this->wsExportUrl;
	}

	/**
	 * Get a URL for the WS Export tool.
	 * @param Title $title
	 * @param string|null $format
	 * @return string
	 */
	public function getExportUrl( Title $title, ?string $format = null ): string {
		$title = wfUrlencode( $title->getPrefixedDBkey() );
		if ( $format ) {
			$urlFormat = $this->wsExportUrl . '/?format=%s&lang=%s&page=%s';
			return sprintf( $urlFormat, $format, $this->lang, $title );
		} else {
			$urlFormat = $this->wsExportUrl . '/?lang=%s&title=%s';
			return sprintf( $urlFormat, $this->lang, $title );
		}
	}
}
