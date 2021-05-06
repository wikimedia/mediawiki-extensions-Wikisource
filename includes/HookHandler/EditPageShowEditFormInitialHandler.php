<?php

namespace MediaWiki\Extension\Wikisource\HookHandler;

use Config;
use EditPage;
use MediaWiki\Hook\EditPage__showEditForm_initialHook;
use MWException;
use OutputPage;

// phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName
class EditPageShowEditFormInitialHandler implements EditPage__showEditForm_initialHook {

	/** @var bool */
	private $enabled;

	/** @var string */
	private $toolUrl;

	/**
	 * @param Config $config
	 */
	public function __construct( Config $config ) {
		$this->enabled = (bool)$config->get( 'WikisourceEnableOcr' );
		$this->toolUrl = rtrim( $config->get( 'WikisourceOcrUrl' ), '/' );
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
			throw new MWException( 'Please set tool URL with $wgWikisourceOcrUrl' );
		}
		// Add OCR modules.
		$out->addModules( 'ext.wikisource.OCR' );
		$out->addJsConfigVars( 'WikisourceOcrUrl', $this->toolUrl );
	}
}
