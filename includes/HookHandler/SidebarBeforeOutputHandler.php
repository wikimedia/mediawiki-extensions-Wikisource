<?php

namespace MediaWiki\Extension\Wikisource\HookHandler;

use ExtensionRegistry;
use Language;
use MediaWiki\Config\Config;
use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\Gadgets\GadgetRepo;
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
		$this->wsExport = new WsExport(
			$contentLanguage,
			$config->get( 'WikisourceWsExportUrl' ),
			$config->get( 'ServerName' )
		);
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

		// Do not add export links to non-content namespaces, the main page, pages that don't exist, or during editing.
		$exportNamespaceIds = $skin->getConfig()->get( 'ContentNamespaces' );
		if (
			!in_array( $skin->getTitle()->getNamespace(), $exportNamespaceIds )
			|| $skin->getTitle()->isMainPage()
			|| !$skin->getTitle()->exists()
			|| in_array( $skin->getRequest()->getVal( 'action' ), [ 'edit', 'submit' ] )
		) {
			return;
		}

		// Add the links to the sidebar.
		$collectionPortletId = 'coll-print_export';
		$electronPdfPortletId = 'electronpdfservice-sidebar-portlet-heading';
		if ( isset( $sidebar[$collectionPortletId] ) || isset( $sidebar[ $electronPdfPortletId ] ) ) {
			// If the Collection or ElectronPdfService extension is installed, first remove its PDF link,
			$portletId = isset( $sidebar[$collectionPortletId] ) ? $collectionPortletId : $electronPdfPortletId;
			foreach ( $sidebar[$portletId] as $linkIndex => $collectionsLink ) {
				if ( in_array( $collectionsLink['id'], [ 'coll-download-as-rl', 'electron-print_pdf' ] ) ) {
					unset( $sidebar[$portletId][ $linkIndex ] );
				}
			}
			// and then add our links to the print/export portlet.
			$sidebar[$portletId] += $this->getLinks( $skin );
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
				'href' => $this->wsExport->getExportUrl( $context->getTitle(), 'epub' ),
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
				'href' => $this->wsExport->getExportUrl( $context->getTitle(), 'pdf' ),
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
