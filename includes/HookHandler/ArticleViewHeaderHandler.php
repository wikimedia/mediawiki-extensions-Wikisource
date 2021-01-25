<?php

namespace MediaWiki\Extension\Wikisource\HookHandler;

use Article;
use Config;
use Language;
use MediaWiki\Extension\Wikisource\WsExport;
use MediaWiki\Page\Hook\ArticleViewHeaderHook;
use OOUI\ButtonWidget;
use ParserOutput;

class ArticleViewHeaderHandler implements ArticleViewHeaderHook {

	/** @var WsExport */
	private $wsExport;

	/**
	 * @param Config $config
	 * @param Language $contentLanguage
	 */
	public function __construct( Config $config, Language $contentLanguage ) {
		$this->wsExport = new WsExport( $contentLanguage, $config->get( 'WikisourceWsExportUrl' ) );
	}

	/**
	 * @param Article $article
	 * @param bool|ParserOutput &$outputDone
	 * @param bool &$pcache
	 * @return bool|void
	 */
	public function onArticleViewHeader( $article, &$outputDone, &$pcache ) {
		// Only show on mainspace pages that exist (and not the mainpage).
		if ( !$article->getTitle()->inNamespace( NS_MAIN )
			|| !$article->getTitle()->exists()
			|| $article->getTitle()->isMainPage()
		) {
			return;
		}

		$out = $article->getContext()->getOutput();
		$out->enableOOUI();
		$button = new ButtonWidget( [
			'href' => $this->wsExport->getExportUrl( $article->getTitle(), 'epub' ),
			'label' => $article->getContext()->msg( 'wikisource-download-button' )->text(),
			'title' => $article->getContext()->msg( 'wikisource-download-epub-tooltip' )->text(),
			'flags' => [ 'primary', 'progressive' ],
			'classes' => [ 'ext-wikisource-download-button' ],
			'infusable' => true,
			'data' => [ 'wsExportUrl' => $this->wsExport->getBaseUrl() ],
		] );
		$out->addModules( [ 'ext.wikisource.download' ] );
		$out->addModuleStyles( 'ext.wikisource.download.icons' );
		// @HACK: Add a tilde to force sorting towards the end of the indicator list,
		// because there's no way to set the indicators' order.
		// Its ID ends up as #mw-indicator-.7Eext-wikisource-download
		$out->setIndicators( [ '~ext-wikisource-download' => $button ] );
	}
}
