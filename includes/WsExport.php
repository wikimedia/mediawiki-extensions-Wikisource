<?php

namespace MediaWiki\Extension\Wikisource;

use Language;
use Title;

class WsExport {

	/** @var Language */
	private $contentLanguage;

	/** @var string Base URL for the WS Export tool. */
	private $wsExportUrl;

	/**
	 * @param Language $contentLanguage
	 * @param string $wsExportUrl
	 */
	public function __construct( Language $contentLanguage, string $wsExportUrl ) {
		$this->contentLanguage = $contentLanguage;
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
		$lang = $this->contentLanguage->getCode();
		$title = wfUrlencode( $title->getPrefixedDBkey() );
		if ( $format ) {
			$urlFormat = $this->wsExportUrl . '/?format=%s&lang=%s&page=%s';
			return sprintf( $urlFormat, $format, $lang, $title );
		} else {
			$urlFormat = $this->wsExportUrl . '/?lang=%s&title=%s';
			return sprintf( $urlFormat, $lang, $title );
		}
	}
}
