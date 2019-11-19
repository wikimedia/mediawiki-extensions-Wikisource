<?php

declare( strict_types = 1 );

namespace MediaWiki\Extension\Wikisource;

use MediaWiki\MediaWikiServices;
use Site;
use SiteLookup;
use Wikibase\Client\Hooks\SidebarLinkBadgeDisplay;
use Wikibase\Client\WikibaseClient;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Services\Lookup\EntityLookup;
use Wikibase\DataModel\SiteLink;
use Wikibase\Client\Usage\UsageAccumulator;

/**
 * Handler for the WikibaseClientOtherProjectsSidebar hook.
 * Adds sitelinks of the work item if the page is connected to an edition item
 *
 * @license GPL-2.0-or-later
 * @author  Thomas Pellissier Tanon
 */
class OtherProjectsSidebarHookHandler {

	/**
	 * @var EntityLookup
	 */
	private $entityLookup;

	/**
	 * @var EditionLookup
	 */
	private $editionLookup;

	/**
	 * @var SiteLookup
	 */
	private $siteLookup;

	/**
	 * @var SidebarLinkBadgeDisplay
	 */
	private $sidebarLinkBadgeDisplay;

	/**
	 * @var UsageAccumulator
	 */
	private $usageAccumulator;

	/**
	 * @var string[]
	 */
	private $siteIdsToOutput;

	/**
	 * @param UsageAccumulator $usageAccumulator
	 * @param string[] $siteIdsToOutput
	 * @return self
	 */
	private static function newFromGlobalState(
		UsageAccumulator $usageAccumulator, array $siteIdsToOutput
	) : self {
		$wikibaseClient = WikibaseClient::getDefaultInstance();
		return new self(
			$wikibaseClient->getStore()->getEntityLookup(),
			EditionLookup::newFromGlobalState( $usageAccumulator ),
			MediaWikiServices::getInstance()->getSiteLookup(),
			$wikibaseClient->getSidebarLinkBadgeDisplay(),
			$usageAccumulator,
			$siteIdsToOutput
		);
	}

	/**
	 * @param EntityLookup $entityLookup
	 * @param EditionLookup $editionLookup
	 * @param SiteLookup $siteLookup
	 * @param SidebarLinkBadgeDisplay $sidebarLinkBadgeDisplay
	 * @param UsageAccumulator $usageAccumulator
	 * @param string[] $siteIdsToOutput
	 */
	public function __construct(
		EntityLookup $entityLookup,
		EditionLookup $editionLookup,
		SiteLookup $siteLookup,
		SidebarLinkBadgeDisplay $sidebarLinkBadgeDisplay,
		UsageAccumulator $usageAccumulator,
		array $siteIdsToOutput
	) {
		$this->entityLookup = $entityLookup;
		$this->editionLookup = $editionLookup;
		$this->siteLookup = $siteLookup;
		$this->sidebarLinkBadgeDisplay = $sidebarLinkBadgeDisplay;
		$this->usageAccumulator = $usageAccumulator;
		$this->siteIdsToOutput = $siteIdsToOutput;
	}

	/**
	 * Fills the sidebar with the links from the work item when it exists
	 *
	 * @param ItemId $itemId
	 * @param array &$sidebar
	 * @param string[] $siteIdsToOutput
	 * @param UsageAccumulator $usageAccumulator
	 */
	public static function addToSidebar(
		ItemId $itemId, array &$sidebar, array $siteIdsToOutput, UsageAccumulator $usageAccumulator
	) : void {
		self::newFromGlobalState( $usageAccumulator, $siteIdsToOutput )
			->doAddToSidebar( $itemId, $sidebar );
	}

	/**
	 * Fills the sidebar with the links from the work item when it exists
	 *
	 * @param ItemId $itemId
	 * @param array &$sidebar
	 */
	public function doAddToSidebar( ItemId $itemId, array &$sidebar ) : void {
		$workItemIds = $this->editionLookup->getWorks( $itemId );
		foreach ( $workItemIds as $workItemId ) {
			$this->addItemSiteLinksToSidebar( $workItemId, $sidebar );
		}
	}

	private function addItemSiteLinksToSidebar( ItemId $itemId, array &$sidebar ) : void {
		$this->usageAccumulator->addSiteLinksUsage( $itemId );

		$siteLinks = $this->getSiteLinks( $itemId );
		foreach ( $siteLinks as $siteLink ) {
			if ( !in_array( $siteLink->getSiteId(), $this->siteIdsToOutput ) ) {
				continue;
			}

			$site = $this->siteLookup->getSite( $siteLink->getSiteId() );
			if ( $site === null ) {
				continue;
			}
			$group = $site->getGroup();
			$globalId = $site->getGlobalId();

			if (
				!array_key_exists( $group, $sidebar ) ||
				!array_key_exists( $globalId, $sidebar[$group] )
			) {
				$sidebar[$group][$globalId] = $this->buildSidebarLink( $siteLink, $site );
			}
		}
	}

	/**
	 * @return SiteLink[]
	 */
	private function getSiteLinks( ItemId $itemId ) : array {
		/**
		 * @var Item $item
		 */
		$item = $this->entityLookup->getEntity( $itemId );
		if ( $item === null ) {
			return [];
		}
		'@phan-var Item $item';
		return $item->getSiteLinkList()->toArray();
	}

	/**
	 * @return string[] Array of attributes describing a sidebar link.
	 */
	private function buildSidebarLink( SiteLink $siteLink, Site $site ) : array {
		$attributes = [
			'msg' => 'wikibase-otherprojects-' . $site->getGroup(),
			'class' => 'wb-otherproject-link wb-otherproject-' . $site->getGroup(),
			'href' => $site->getPageUrl( $siteLink->getPageName() )
		];
		$siteLanguageCode = $site->getLanguageCode();
		if ( $siteLanguageCode !== null ) {
			$attributes['hreflang'] = $siteLanguageCode;
		}

		$this->sidebarLinkBadgeDisplay->applyBadgeToLink(
			$attributes,
			$this->sidebarLinkBadgeDisplay->getBadgeInfo( $siteLink->getBadges() )
		);

		return $attributes;
	}
}
