<?php

namespace MediaWiki\Extension\Wikisource\HookHandler;

use MediaWiki\Config\Config;
use MediaWiki\Config\ConfigException;
use MediaWiki\EditPage\EditPage;
use MediaWiki\Hook\EditPage__showEditForm_initialHook;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\ResourceLoader\Context;
use MediaWiki\User\Options\UserOptionsLookup;
use Wikimedia\ObjectCache\WANObjectCache;

class EditPageShowEditFormInitialHandler implements EditPage__showEditForm_initialHook {

	private readonly bool $enabled;
	private readonly string $toolUrl;
	private readonly array $WikisourceTranskribusModels;

	public function __construct(
		Config $config,
		private readonly UserOptionsLookup $userOptionsLookup,
	) {
		$this->enabled = (bool)$config->get( 'WikisourceEnableOcr' );
		$this->toolUrl = rtrim( $config->get( 'WikisourceOcrUrl' ), '/' );
		$this->WikisourceTranskribusModels = $config->get( 'WikisourceTranskribusModels' );
	}

	/**
	 * @param EditPage $editor
	 * @param OutputPage $out OutputPage instance to write to
	 * @return bool|void True or no return value to continue or false to abort
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
		$useBetaToolbar = $this->userOptionsLookup
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
		if ( defined( 'MW_PHPUNIT_TEST' ) ) {
			return [];
		}
		$http = MediaWikiServices::getInstance()->getHttpRequestFactory();
		$cache = MediaWikiServices::getInstance()->getMainWANObjectCache();
		$logger = LoggerFactory::getInstance( 'Wikisource' );
		$toolUrl = rtrim( $config->get( 'WikisourceOcrUrl' ), '/' );
		$proxy = $config->get( 'WikisourceHttpProxy' );
		$url = $toolUrl . '/api/available_langs?engine=' . $engine;
		$fname = __METHOD__;
		$callback = static function ( $oldValue, &$ttl ) use ( $url, $http, $proxy, $logger, $engine, $fname ) {
			$logger->debug( 'Language list not cached for {engine}, fetching now', [ 'engine' => $engine ] );
			$options = [
				// T442064: Low timeouts. Generally responds < 200ms.
				'connectTimeout' => 0.5,
				'timeout' => 1,
			];
			if ( $proxy ) {
				$options[ 'proxy' ] = $proxy;
			}
			$startTime = microtime( true );
			$response = $http->get( $url, $options, $fname );
			$logger->info(
				'OCR tool responded with {response_size} bytes after {response_time}ms',
				[
					'response_size' => strlen( (string)$response ),
					'response_time' => ( microtime( true ) - $startTime ) * 1000,
				]
			);
			if ( $response === null ) {
				// T442064: Cache absence
				$ttl = WANObjectCache::TTL_HOUR;
				$logger->warning( 'OCR empty response from tool', [ 'url' => $url ] );
				return [];
			}
			$contents = json_decode( $response );
			return $contents->available_langs ?? [];
		};
		return $cache->buildGetWithSetCallback()
			->globalKey( 'wikisource-ocr-langs', $engine )
			->keepForADay()
			// T442064: Avoid stampedes
			->allowStale( WANObjectCache::TTL_WEEK )
			->busyValue( [] )
			->callback( $callback )
			->fetch();
	}
}
