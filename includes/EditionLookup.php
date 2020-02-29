<?php

declare( strict_types = 1 );

namespace MediaWiki\Extension\Wikisource;

use RequestContext;
use Wikibase\Client\Usage\UsageAccumulator;
use Wikibase\Client\WikibaseClient;
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
	 * @param ItemId $itemId
	 * @return ItemId[]
	 */
	public function getWorks( ItemId $itemId ) : array {
		return $this->getValuesForItemId( $itemId, $this->editionOfPropertyId );
	}

	/**
	 * @param ItemId $itemId
	 * @return ItemId[]
	 */
	public function getEditions( ItemId $itemId ) : array {
		return $this->getValuesForItemId( $itemId, $this->editionPropertyId );
	}

	/**
	 * @param ItemId $itemId
	 * @param PropertyId $propertyId
	 * @return ItemId[]
	 */
	private function getValuesForItemId( ItemId $itemId, PropertyId $propertyId ) : array {
		$item = $this->getItem( $itemId );
		if ( $item === null ) {
			return [];
		}
		return $this->getValuesForItem( $item, $propertyId );
	}

	/**
	 * @param Item $item
	 * @param PropertyId $propertyId
	 * @return ItemId[]
	 */
	private function getValuesForItem( Item $item, PropertyId $propertyId ) : array {
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

	/**
	 * @param ItemId $itemId
	 *
	 * @return Item|null
	 */
	private function getItem( ItemId $itemId ) : ?Item {
		try {
			return $this->entityLookup->getEntity( $itemId );
		} catch ( EntityLookupException $e ) {
			return null;
		}
	}

}
