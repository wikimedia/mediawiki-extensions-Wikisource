<?php

namespace MediaWiki\Extension\Wikisource\HookHandler;

use Config;
use ExtensionRegistry;
use GadgetRepo;
use IContextSource;
use Language;
use MediaWiki\Extension\Wikisource\WsExport;
use MediaWiki\Hook\SidebarBeforeOutputHook;
use Skin;

class SidebarBeforeOutputHandler implements SidebarBeforeOutputHook {

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
	 * Handle the SidebarBeforeOutput hook.
	 * @param Skin $skin
	 * @param array &$sidebar
	 */
	public function onSidebarBeforeOutput( $skin, &$sidebar ): void {
		// Do not add the export links if the user has a gadget that does the same.
		// @TODO Remove this after all these gadgets have been removed.
		if ( ExtensionRegistry::getInstance()->isLoaded( 'Gadgets' ) ) {
			// @phan-suppress-next-line PhanUndeclaredClassMethod
			$gadgetRepo = GadgetRepo::singleton();
			// Gadget names are case sensitive. See T256392 for a list.
			$exportGadgets = [ 'ePubDownloadLink', 'WSexport' ];
			foreach ( $exportGadgets as $exportGadget ) {
				if ( array_search( $exportGadget, $gadgetRepo->getGadgetIds() ) === false ) {
					continue;
				}
				if ( $gadgetRepo->getGadget( $exportGadget )->isEnabled( $skin->getUser() ) ) {
					return;
				}
			}
		}

		// Do not add the export links to non-content namespaces, the main page, or pages that don't exist.
		$exportNamespaceIds = $skin->getConfig()->get( 'ContentNamespaces' );
		if (
			!in_array( $skin->getTitle()->getNamespace(), $exportNamespaceIds )
			|| $skin->getTitle()->isMainPage()
			|| !$skin->getTitle()->exists()
		) {
			return;
		}

		// Add the links to the sidebar.
		if ( isset( $sidebar['coll-print_export'] ) ) {
			// If the Collection or ElectronPdfService extension is installed, first remove its PDF link,
			foreach ( $sidebar['coll-print_export'] as $linkIndex => $collectionsLink ) {
				if ( in_array( $collectionsLink['id'], [ 'coll-download-as-rl', 'electron-print_pdf' ] ) ) {
					unset( $sidebar['coll-print_export'][ $linkIndex ] );
				}
			}
			// and then add our links to Collection's portlet.
			$sidebar['coll-print_export'] += $this->getLinks( $skin );
		} else {
			// If Collection isn't installed, add a new portlet with our links.
			$sidebar['wikisource-export-portlet'] = $this->getLinks( $skin );
			// Move the 'printable' link into this portlet for consistency. The Collection extension also does this.
			if ( isset( $sidebar['TOOLBOX']['print'] ) ) {
				$sidebar['wikisource-export-portlet'][] = $sidebar['TOOLBOX']['print'];
				unset( $sidebar['TOOLBOX']['print'] );
			}
		}
	}

	/**
	 * Get the structure array for the list of sidebar links.
	 *
	 * @param IContextSource $context
	 * @return array[]
	 */
	private function getLinks( IContextSource $context ): array {
		$links = [
			'wikisource-export-epub' => [
				'msg' => 'wikisource-download-epub',
				'title' => $context->msg( 'wikisource-download-epub-tooltip' )->text(),
				'id' => 'wikisource-download-epub',
				'href' => $this->wsExport->getExportUrl( $context->getTitle(), 'epub-3' ),
			],
			'wikisource-export-mobi' => [
				'msg' => 'wikisource-download-mobi',
				'title' => $context->msg( 'wikisource-download-mobi-tooltip' )->text(),
				'id' => 'wikisource-download-mobi',
				'href' => $this->wsExport->getExportUrl( $context->getTitle(), 'mobi' ),
			],
			'wikisource-export-pdf' => [
				'msg' => 'wikisource-download-pdf',
				'title' => $context->msg( 'wikisource-download-pdf-tooltip' )->text(),
				'id' => 'wikisource-download-pdf',
				'href' => $this->wsExport->getExportUrl( $context->getTitle(), 'pdf-a4' ),
			],
			'wikisource-export-any' => [
				'msg' => 'wikisource-download-choose',
				'title' => $context->msg( 'wikisource-download-choose-tooltip' )->text(),
				'id' => 'wikisource-download-choose',
				'href' => $this->wsExport->getExportUrl( $context->getTitle() ),
			],
		];
		return $links;
	}
}
