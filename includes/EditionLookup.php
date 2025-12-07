<?php

declare( strict_types = 1 );

namespace MediaWiki\Extension\Wikisource;

use MediaWiki\Context\RequestContext;
use MediaWiki\MediaWikiServices;
use Wikibase\Client\Usage\UsageAccumulator;
use Wikibase\Client\WikibaseClient;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\NumericPropertyId;
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
	 * @param UsageAccumulator $usageAccumulator
	 * @return self
	 */
	public static function newFromGlobalState( UsageAccumulator $usageAccumulator ): self {
		return new self(
			WikibaseClient::getRestrictedEntityLookupFactory()->getRestrictedEntityLookup(
				// TODO: There has to be a better place we can get a parser instance from...
				MediaWikiServices::getInstance()->getParser()
			),
			self::getPropertyIdFromConfig( 'WikisourceWikibaseEditionProperty' ),
			self::getPropertyIdFromConfig( 'WikisourceWikibaseEditionOfProperty' ),
			$usageAccumulator
		);
	}

	private static function getPropertyIdFromConfig( string $configParamName ): NumericPropertyId {
		return new NumericPropertyId( RequestContext::getMain()->getConfig()->get( $configParamName ) );
	}

	public function __construct(
		private readonly EntityLookup $entityLookup,
		private readonly NumericPropertyId $editionPropertyId,
		private readonly NumericPropertyId $editionOfPropertyId,
		private readonly UsageAccumulator $usageAccumulator,
	) {
	}

	/**
	 * @param Item $item
	 * @return Item[]
	 */
	public function getWorks( Item $item ): array {
		return $this->getItemValuesForItem( $item, $this->editionOfPropertyId );
	}

	/**
	 * @param Item $item
	 * @return Item[]
	 */
	public function getEditions( Item $item ): array {
		return $this->getItemValuesForItem( $item, $this->editionPropertyId );
	}

	/**
	 * @param Item $item
	 * @param NumericPropertyId $propertyId
	 * @return Item[]
	 */
	private function getItemValuesForItem( Item $item, NumericPropertyId $propertyId ): array {
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
	 * @param NumericPropertyId $propertyId
	 * @return ItemId[]
	 */
	private function getItemIdValuesForItem( Item $item, NumericPropertyId $propertyId ): array {
		$this->usageAccumulator->addStatementUsage( $item->getId(), $propertyId );

		$statements = $item->getStatements()->getByPropertyId( $propertyId );
		$mainSnaks = $statements->getBestStatements()->getMainSnaks();
		return $this->getMainSnakItemIds( $mainSnaks );
	}

	/**
	 * @param Snak[] $mainSnaks
	 * @return ItemId[]
	 */
	private function getMainSnakItemIds( array $mainSnaks ): array {
		$values = [];
		foreach ( $mainSnaks as $snak ) {
			if ( $snak instanceof PropertyValueSnak ) {
				$value = $snak->getDataValue();
				if ( $value instanceof EntityIdValue ) {
					$entityId = $value->getEntityId();
					if ( $entityId instanceof ItemId ) {
						$values[] = $entityId;
					}
				}
			}
		}
		return $values;
	}

	private function getEntity( EntityId $itemId ): ?EntityDocument {
		try {
			return $this->entityLookup->getEntity( $itemId );
		} catch ( EntityLookupException ) {
			return null;
		}
	}
}
