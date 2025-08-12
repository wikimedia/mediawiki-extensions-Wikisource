<?php

declare( strict_types = 1 );

namespace MediaWiki\Extension\Wikisource\HookHandler;

use MediaWiki\Config\Config;
use MediaWiki\Hook\BeforePageDisplayHook;
use MediaWiki\Output\OutputPage;
use MediaWiki\Skin\Skin;
use MediaWiki\User\UserGroupManager;
use ProofreadPage\ProofreadPageInit;

/**
 * Hook handler for the Index namespace
 */
class BeforePageDisplayHandler implements BeforePageDisplayHook {

	/** @var UserGroupManager UserGroupManager service for checking user permissions */
	private UserGroupManager $userGroupManager;

	/** @var Config Config service for accessing configuration variables */
	private Config $config;

	public function __construct( UserGroupManager $userGroupManager, Config $config ) {
		$this->userGroupManager = $userGroupManager;
		$this->config = $config;
	}

	/**
	 * Add modules to Index namespace pages
	 *
	 * @param OutputPage $out
	 * @param Skin $skin
	 * @return void
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$user = $out->getUser();
		$userGroups = $this->userGroupManager->getUserGroups( $user );

		// Check if the user is an admin
		if ( in_array( 'sysop', $userGroups ) ) {
			$enableOcr = $this->config->get( 'WikisourceEnableOcr' );
			$enableBulkOcr = $this->config->get( 'WikisourceEnableBulkOcr' );
			$ocrUrl = $this->config->get( 'WikisourceOcrUrl' );
			$title = $out->getTitle();
			// Check if Ocr and BulkOcr are enabled and OcrUrl is configured then check if we are in the Index namespace
			if ( $enableOcr && $enableBulkOcr && $ocrUrl &&
				$title->inNamespace( ProofreadPageInit::getNamespaceId( 'index' ) )
			) {
				$out->addJsConfigVars( 'WikisourceOcrUrl', rtrim( $ocrUrl, '/' ) );
				$out->addModules( [ 'ext.wikisource.bulkocr' ] );
			}
		}
	}
}
