<?php

declare( strict_types = 1 );

namespace MediaWiki\Extension\Wikisource\HookHandler;

use MediaWiki\Config\Config;
use MediaWiki\Hook\BeforePageDisplayHook;
use MediaWiki\Output\OutputPage;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Skin\Skin;
use MediaWiki\User\UserGroupManager;
use ProofreadPage\ProofreadPageInit;

/**
 * Hook handler for the Index namespace
 */
class BeforePageDisplayHandler implements BeforePageDisplayHook {

	public function __construct(
		private readonly UserGroupManager $userGroupManager,
		private readonly Config $config,
		private readonly ExtensionRegistry $extensionRegistry,
	) {
	}

	/**
	 * Add modules to Index namespace pages
	 *
	 * @param OutputPage $out
	 * @param Skin $skin
	 * @return void
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		// Ensure ProofreadPage is loaded.
		if ( !$this->extensionRegistry->isLoaded( 'ProofreadPage' ) ) {
			return;
		}

		// Check if the user is an admin
		$user = $out->getUser();
		$userGroups = $this->userGroupManager->getUserGroups( $user );
		if ( in_array( 'sysop', $userGroups ) ) {
			$enableOcr = $this->config->get( 'WikisourceEnableOcr' );
			$enableBulkOcr = $this->config->get( 'WikisourceEnableBulkOcr' );
			$ocrUrl = $this->config->get( 'WikisourceOcrUrl' );
			$title = $out->getTitle();
			// Check if Ocr and BulkOcr are enabled and OcrUrl is configured then check if we are in the Index namespace
			if ( $enableOcr && $enableBulkOcr && $ocrUrl &&
				$title->inNamespace( ProofreadPageInit::getNamespaceId( 'index' ) )
			) {
				$out->getCSP()->addDefaultSrc( $ocrUrl );
				$out->addJsConfigVars( 'WikisourceOcrUrl', rtrim( $ocrUrl, '/' ) );
				$out->addModules( [ 'ext.wikisource.bulkocr' ] );
			}
		}
	}
}
