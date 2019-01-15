<?php

namespace MediaWiki\Extension\Wikisource;

use RequestContext;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Services\Lookup\EntityLookup;
use Wikibase\DataModel\Services\Lookup\EntityLookupException;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\Client\WikibaseClient;
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
	 * @return self
	 */
	public static function newFromGlobalState() {
		return new self(
			WikibaseClient::getDefaultInstance()->getStore()->getEntityLookup(),
			self::getPropertyIdFromConfig( 'WikisourceWikibaseEditionProperty' ),
			self::getPropertyIdFromConfig( 'WikisourceWikibaseEditionOfProperty' )
		);
	}

	private static function getPropertyIdFromConfig( $configParamName ) {
		return new PropertyId( RequestContext::getMain()->getConfig()->get( $configParamName ) );
	}

	/**
	 * @param EntityLookup $entityLookup
	 * @param PropertyId $editionPropertyId
	 * @param PropertyId $editionOfPropertyId
	 */
	public function __construct(
		EntityLookup $entityLookup,
		PropertyId $editionPropertyId,
		PropertyId $editionOfPropertyId
	) {
		$this->entityLookup = $entityLookup;
		$this->editionPropertyId = $editionPropertyId;
		$this->editionOfPropertyId = $editionOfPropertyId;
	}

	/**
	 * @param ItemId $itemId
	 * @return ItemId[]
	 */
	public function getWorks( ItemId $itemId ) {
		return $this->getValuesForItemId( $itemId, $this->editionOfPropertyId );
	}

	/**
	 * @param ItemId $itemId
	 * @return ItemId[]
	 */
	public function getEditions( ItemId $itemId ) {
		return $this->getValuesForItemId( $itemId, $this->editionPropertyId );
	}

	/**
	 * @return ItemId[]
	 */
	private function getValuesForItemId( ItemId $itemId, PropertyId $propertyId ) {
		$item = $this->getItem( $itemId );
		if ( $item === null ) {
			return [];
		}
		return $this->getValuesForItem( $item, $propertyId );
	}

	/**
	 * @return ItemId[]
	 */
	private function getValuesForItem( Item $item, PropertyId $propertyId ) {
		$statements = $item->getStatements()->getByPropertyId( $propertyId );
		$mainSnaks = $statements->getBestStatements()->getMainSnaks();
		return $this->getMainSnakItemIds( $mainSnaks );
	}

	/**
	 * @param Snak[] $mainSnaks
	 * @return ItemId[]
	 */
	private function getMainSnakItemIds( array $mainSnaks ) {
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
	private function getItem( ItemId $itemId ) {
		try {
			return $this->entityLookup->getEntity( $itemId );
		} catch ( EntityLookupException $e ) {
			return null;
		}
	}

}
