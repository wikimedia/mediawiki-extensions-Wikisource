<?php

namespace MediaWiki\Extension\Wikisource;

use PHPUnit\Framework\TestCase;
use Wikibase\Client\Usage\UsageAccumulator;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\NumericPropertyId;
use Wikibase\DataModel\Services\Lookup\InMemoryEntityLookup;
use Wikibase\DataModel\SiteLink;
use Wikibase\DataModel\Snak\PropertySomeValueSnak;
use Wikibase\DataModel\Snak\PropertyValueSnak;

/**
 * @covers \MediaWiki\Extension\Wikisource\WikibaseClientSiteLinksForItemHandler
 *
 * @group Wikisource
 *
 * @license GPL-2.0-or-later
 * @author Thomas Pellissier Tanon
 */
class WikibaseClientSiteLinksForItemHandlerTest extends TestCase {

	/**
	 * @dataProvider doProvideSiteLinksProvider
	 */
	public function testDoProvideSiteLinks(
		array $expected,
		array $beginning,
		Item $item
	) {
		$entityLookup = new InMemoryEntityLookup();
		$entityLookup->addEntity( $this->q1() );
		$entityLookup->addEntity( $this->q2() );
		$entityLookup->addEntity( $this->q3() );

		$handler = new WikibaseClientSiteLinksForItemHandler(
			$entityLookup,
			new EditionLookup(
				$entityLookup,
				new NumericPropertyId( 'P747' ),
				new NumericPropertyId( 'P629' ),
				$this->createMock( UsageAccumulator::class )
			),
			$this->createMock( UsageAccumulator::class )
		);
		$handler->doProvideSiteLinks( $item, $beginning );
		$this->assertEquals( $expected, $beginning );
	}

	public function doProvideSiteLinksProvider() {
		return [
			'Item with work' => [
				[
					'enwiki' => new SiteLink( 'enwiki', 'Foo' ),
					'frwiki' => new SiteLink( 'frwiki', 'Foo' ),
				],
				[],
				$this->q1()
			],
			'Item with work with existing' => [
				[
					'enwiki' => new SiteLink( 'enwiki', 'Bar' ),
					'frwiki' => new SiteLink( 'frwiki', 'Foo' ),
				],
				[
					'enwiki' => new SiteLink( 'enwiki', 'Bar' ),
				],
				$this->q1()
			],
			'Item without work' => [
				[
					'enwiki' => new SiteLink( 'enwiki', 'Bar' ),
				],
				[
					'enwiki' => new SiteLink( 'enwiki', 'Bar' ),
				],
				$this->q2()
			],
			'Not existing work item' => [
				[
					'enwiki' => new SiteLink( 'enwiki', 'Bar' ),
				],
				[
					'enwiki' => new SiteLink( 'enwiki', 'Bar' ),
				],
				$this->q3()
			],
		];
	}

	public function q1() {
		$item = new Item( new ItemId( 'Q1' ) );
		$item->getStatements()->addNewStatement(
			new PropertyValueSnak( new NumericPropertyId( 'P629' ), new EntityIdValue( new ItemId( 'Q2' ) ) )
		);
		$item->getStatements()->addNewStatement(
			new PropertySomeValueSnak( new NumericPropertyId( 'P629' ) )
		);
		return $item;
	}

	public function q2() {
		$item = new Item( new ItemId( 'Q2' ) );
		$item->getSiteLinkList()->addNewSiteLink( 'enwiki', 'Foo' );
		$item->getSiteLinkList()->addNewSiteLink( 'frwiki', 'Foo' );
		return $item;
	}

	public function q3() {
		$item = new Item( new ItemId( 'Q3' ) );
		$item->getStatements()->addNewStatement(
			new PropertyValueSnak(
				new NumericPropertyId( 'P629' ),
				new EntityIdValue( new ItemId( 'Q999' ) )
			)
		);
		return $item;
	}
}
