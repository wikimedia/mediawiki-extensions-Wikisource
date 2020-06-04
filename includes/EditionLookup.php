<?php

declare( strict_types = 1 );

namespace MediaWiki\Extension\Wikisource;

use RequestContext;
use Wikibase\Client\Usage\UsageAccumulator;
use Wikibase\Client\WikibaseClient;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Services\Lookup\EntityLookup;
use Wikibase\DataModel\Services\Lookup\EntityLookupException;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\DataModel\Snak\Snak;

/**
 * Lookup to find editions of a given work and work of a given edition
 *
 * @since 0.1
 *
 * @license GPL-2.0-or-later
 * @author  Thomas Pellissier Tanon
 */
class EditionLookup {

	/**
	 * @var EntityLookup
	 */
	private $entityLookup;

	/**
	 * @var PropertyId
	 */
	private $editionPropertyId;

	/**
	 * @var PropertyId
	 */
	private $editionOfPropertyId;

	/**
	 * @var UsageAccumulator
	 */
	private $usageAccumulator;

	/**
	 * @param UsageAccumulator $usageAccumulator
	 * @return self
	 */
	public static function newFromGlobalState( UsageAccumulator $usageAccumulator ) : self {
		return new self(
			WikibaseClient::getDefaultInstance()->getStore()->getEntityLookup(),
			self::getPropertyIdFromConfig( 'WikisourceWikibaseEditionProperty' ),
			self::getPropertyIdFromConfig( 'WikisourceWikibaseEditionOfProperty' ),
			$usageAccumulator
		);
	}

	private static function getPropertyIdFromConfig( string $configParamName ) : PropertyId {
		return new PropertyId( RequestContext::getMain()->getConfig()->get( $configParamName ) );
	}

	/**
	 * @param EntityLookup $entityLookup
	 * @param PropertyId $editionPropertyId
	 * @param PropertyId $editionOfPropertyId
	 * @param UsageAccumulator $usageAccumulator
	 */
	public function __construct(
		EntityLookup $entityLookup,
		PropertyId $editionPropertyId,
		PropertyId $editionOfPropertyId,
		UsageAccumulator $usageAccumulator
	) {
		$this->entityLookup = $entityLookup;
		$this->editionPropertyId = $editionPropertyId;
		$this->editionOfPropertyId = $editionOfPropertyId;
		$this->usageAccumulator = $usageAccumulator;
	}

	/**
	 * @param Item $item
	 * @return Item[]
	 */
	public function getWorks( Item $item ) : array {
		return $this->getItemValuesForItem( $item, $this->editionOfPropertyId );
	}

	/**
	 * @param Item $item
	 * @return Item[]
	 */
	public function getEditions( Item $item ) : array {
		return $this->getItemValuesForItem( $item, $this->editionPropertyId );
	}

	/**
	 * @param Item $item
	 * @param PropertyId $propertyId
	 * @return Item[]
	 */
	private function getItemValuesForItem( Item $item, PropertyId $propertyId ) : array {
		$items = [];
		foreach ( $this->getItemIdValuesForItem( $item, $propertyId ) as $itemId ) {
			$item = $this->getEntity( $itemId );
			if ( $item instanceof Item ) {
				$items[] = $item;
			}
		}
		return $items;
	}

	/**
	 * @param Item $item
	 * @param PropertyId $propertyId
	 * @return ItemId[]
	 */
	private function getItemIdValuesForItem( Item $item, PropertyId $propertyId ) : array {
		$this->usageAccumulator->addStatementUsage( $item->getId(), $propertyId );

		$statements = $item->getStatements()->getByPropertyId( $propertyId );
		$mainSnaks = $statements->getBestStatements()->getMainSnaks();
		return $this->getMainSnakItemIds( $mainSnaks );
	}

	/**
	 * @param Snak[] $mainSnaks
	 * @return ItemId[]
	 */
	private function getMainSnakItemIds( array $mainSnaks ) : array {
		$values = [];
		foreach ( $mainSnaks as $snak ) {
			if ( $snak instanceof PropertyValueSnak ) {
				$value = $snak->getDataValue();
				if ( $value instanceof EntityIdValue ) {
					$values[] = $value->getEntityId();
				}
			}
		}
		return $values;
	}

	private function getEntity( EntityId $itemId ) : ?EntityDocument {
		try {
			return $this->entityLookup->getEntity( $itemId );
		} catch ( EntityLookupException $e ) {
			return null;
		}
	}
}
