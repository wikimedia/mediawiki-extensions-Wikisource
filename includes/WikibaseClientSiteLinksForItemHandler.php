<?php

declare( strict_types = 1 );

namespace MediaWiki\Extension\Wikisource;

use Wikibase\Client\Usage\UsageAccumulator;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\SiteLink;

/**
 * Handler for the WikibaseClientSiteLinksForItem hook.
 * Adds sitelinks of the work item if the page is connected to an edition item
 *
 * @license GPL-2.0-or-later
 * @author  Thomas Pellissier Tanon
 */
class WikibaseClientSiteLinksForItemHandler {

	/**
	 * @var EditionLookup
	 */
	private $editionLookup;

	/**
	 * @var UsageAccumulator
	 */
	private $usageAccumulator;

	/**
	 * @param UsageAccumulator $usageAccumulator
	 * @return self
	 */
	private static function newFromGlobalState(
		UsageAccumulator $usageAccumulator
	) {
		return new self(
			EditionLookup::newFromGlobalState( $usageAccumulator ),
			$usageAccumulator
		);
	}

	/**
	 * @param EditionLookup $editionLookup
	 * @param UsageAccumulator $usageAccumulator
	 */
	public function __construct(
		EditionLookup $editionLookup,
		UsageAccumulator $usageAccumulator
	) {
		$this->editionLookup = $editionLookup;
		$this->usageAccumulator = $usageAccumulator;
	}

	/**
	 * Fills the sidebar with the links from the work item when it exists
	 *
	 * @param Item $item
	 * @param SiteLink[] &$siteLinks
	 * @param UsageAccumulator $usageAccumulator
	 */
	public static function provideSiteLinks(
		Item $item, array &$siteLinks, UsageAccumulator $usageAccumulator
	) {
		self::newFromGlobalState( $usageAccumulator )
			->doProvideSiteLinks( $item, $siteLinks );
	}

	/**
	 * Fills the sidebar with the links from the work item when it exists
	 *
	 * @param Item $item
	 * @param SiteLink[] &$siteLinks
	 */
	public function doProvideSiteLinks( Item $item, array &$siteLinks ) {
		$workItems = $this->editionLookup->getWorks( $item );
		foreach ( $workItems as $workItem ) {
			$this->addItemSiteLinks( $workItem, $siteLinks );
		}
	}

	private function addItemSiteLinks( Item $item, array &$siteLinks ) {
		$this->usageAccumulator->addSiteLinksUsage( $item->getId() );

		foreach ( $item->getSiteLinkList() as $siteLink ) {
			if ( !array_key_exists( $siteLink->getSiteId(), $siteLinks ) ) {
				$siteLinks[$siteLink->getSiteId()] = $siteLink;
			}
		}
	}
}
