<?php

namespace MediaWiki\Extension\Wikisource\HookHandler;

use Exception;
use MediaWiki\Config\Config;
use MediaWiki\Config\ConfigException;
use MediaWiki\EditPage\EditPage;
use MediaWiki\Hook\EditPage__showEditForm_initialHook;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\ResourceLoader\Context;

// phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName
class EditPageShowEditFormInitialHandler implements EditPage__showEditForm_initialHook {

	/** @var bool */
	private $enabled;

	/** @var string */
	private $toolUrl;

	/** @var array */
	private $WikisourceTranskribusModels;

	/**
	 * @param Config $config
	 */
	public function __construct( Config $config ) {
		$this->enabled = (bool)$config->get( 'WikisourceEnableOcr' );
		$this->toolUrl = rtrim( $config->get( 'WikisourceOcrUrl' ), '/' );
		$this->WikisourceTranskribusModels = $config->get( 'WikisourceTranskribusModels' );
	}

	/**
	 * @param EditPage $editor
	 * @param OutputPage $out OutputPage instance to write to
	 * @return bool|void True or no return value without altering $error to allow the
	 *   edit to continue. Modifying $error and returning true will cause the contents
	 *   of $error to be echoed at the top of the edit form as wikitext. Return false
	 *   to halt editing; you'll need to handle error messages, etc. yourself.
	 */
	public function onEditPage__showEditForm_initial( $editor, $out ) {
		if ( !$this->enabled ) {
			return;
		}
		// Make sure we're editing a page of the right content type (and that PRP is available).
		if ( !defined( 'CONTENT_MODEL_PROOFREAD_PAGE' )
			|| $editor->contentModel !== CONTENT_MODEL_PROOFREAD_PAGE ) {
			return;
		}
		// Make sure there's a tool URL defined.
		if ( !$this->toolUrl ) {
			throw new ConfigException( 'Please set tool URL with $wgWikisourceOcrUrl' );
		}
		// Require the WikiEditor toolbar to be enabled.
		$useBetaToolbar = MediaWikiServices::getInstance()
			->getUserOptionsLookup()
			->getOption( $out->getUser(), 'usebetatoolbar' );
		if ( !$useBetaToolbar ) {
			return;
		}

		// Add tool's URL to Content Security Policy.
		$out->getCSP()->addDefaultSrc( $this->toolUrl );
		// Add OCR modules.
		$out->addModules( 'ext.wikisource.OCR' );
		$out->addJsConfigVars( [
			'WikisourceOcrUrl' => $this->toolUrl,
			'WikisourceTranskribusModels' => $this->WikisourceTranskribusModels,
		] );
	}

	/**
	 * Get all languages/models.
	 * @param Context $context
	 * @param Config $config
	 * @return array
	 */
	public static function getLangs( Context $context, Config $config ) {
		return [
			'google' => self::getLangsForEngine( 'google', $config ),
			'tesseract' => self::getLangsForEngine( 'tesseract', $config ),
			'transkribus' => self::getLangsForEngine( 'transkribus', $config ),
		];
	}

	/**
	 * Get available languages/models for a selected engine.
	 * @param string $engine
	 * @param Config $config
	 * @return array
	 */
	protected static function getLangsForEngine( $engine, $config ) {
		$http = MediaWikiServices::getInstance()->getHttpRequestFactory();
		$cache = MediaWikiServices::getInstance()->getLocalServerObjectCache();
		$toolUrl = rtrim( $config->get( 'WikisourceOcrUrl' ), '/' );
		$url = $toolUrl . '/api/available_langs?engine=' . $engine;
		return $cache->getWithSetCallback(
			$cache->makeGlobalKey( 'wikisource-ocr-langs', $engine ),
			$cache::TTL_DAY,
			static function () use ( $url, $http ) {
				try {
					$response = $http->get( $url );
					if ( $response === null ) {
						return false;
					}
					$contents = json_decode( $response );
					return $contents->available_langs ?? false;
				} catch ( Exception $error ) {
					return false;
				}
			}
		);
	}
}
